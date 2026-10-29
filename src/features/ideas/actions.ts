"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { requireAdmin } from "@/features/auth/dal";
import { createContentWithChecklist } from "@/features/contents/service";
import { routes } from "@/lib/routes";
import {
  convertIdeaSchema,
  ideaIdSchema,
  ideaSchema,
  quickIdeaSchema,
  setIdeaArchivedSchema,
  updateIdeaSchema,
  type IdeaInput,
} from "./schema";

export async function createQuickIdea(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = quickIdeaSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // Daftar pilar di dialog global bisa basi (mis. pilar dinonaktifkan dari perangkat lain).
  if (parsed.data.pillarId) {
    const pillar = await db.pillar.findUnique({
      where: { id: parsed.data.pillarId },
      select: { isActive: true },
    });
    if (!pillar?.isActive) return fail("Pilar sudah tidak aktif. Muat ulang halaman lalu coba lagi.");
  }

  const idea = await db.idea.create({
    data: {
      title: parsed.data.title,
      pillarId: parsed.data.pillarId ?? null,
      medium: parsed.data.medium ?? null,
    },
  });

  revalidatePath(routes.studio.ideas);
  revalidatePath(routes.studio.home);
  return ok({ id: idea.id });
}

function revalidateIdeaRoutes() {
  revalidatePath(routes.studio.ideas);
  revalidatePath(routes.studio.home);
  revalidatePath(routes.studio.pipeline);
}

function toIdeaData(input: IdeaInput) {
  return {
    title: input.title,
    pillarId: input.pillarId,
    medium: input.medium,
    notes: input.notes === "" ? null : input.notes,
    refUrl: input.refUrl === "" ? null : input.refUrl,
    potential: input.potential,
    effort: input.effort,
  };
}

function prismaErrorCode(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

/** Tambah ide dari form lengkap. */
export async function createIdea(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const idea = await db.idea.create({ data: toIdeaData(parsed.data) });
    revalidateIdeaRoutes();
    return ok({ id: idea.id });
  } catch (error) {
    if (prismaErrorCode(error) === "P2003") return fail("Pilar tidak ditemukan");
    throw error;
  }
}

export async function updateIdea(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateIdeaSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, ...data } = parsed.data;

  try {
    await db.idea.update({ where: { id }, data: toIdeaData(data) });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2025") return fail("Ide tidak ditemukan");
    if (code === "P2003") return fail("Pilar tidak ditemukan");
    throw error;
  }
  revalidateIdeaRoutes();
  return ok();
}

/** Arsipkan, atau kembalikan (ke Dipilih jika sudah punya konten, selain itu ke Baru). */
export async function setIdeaArchived(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = setIdeaArchivedSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, archived } = parsed.data;

  const idea = await db.idea.findUnique({
    where: { id },
    select: { content: { select: { id: true } } },
  });
  if (!idea) return fail("Ide tidak ditemukan");

  await db.idea.update({
    where: { id },
    data: { status: archived ? "ARCHIVED" : idea.content ? "PICKED" : "NEW" },
  });
  revalidateIdeaRoutes();
  return ok();
}

/** Hapus permanen; ditolak jika ide sudah dijadikan konten. */
export async function deleteIdea(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = ideaIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await db.$transaction(async (tx) => {
    const idea = await tx.idea.findUnique({
      where: { id: parsed.data.id },
      select: { content: { select: { id: true } } },
    });
    if (!idea) return fail("Ide tidak ditemukan");
    if (idea.content) {
      return fail("Ide ini sudah dijadikan konten. Arsipkan saja, jangan dihapus.");
    }
    await tx.idea.delete({ where: { id: parsed.data.id } });
    return ok();
  });

  if (result.ok) revalidateIdeaRoutes();
  return result;
}

/**
 * Jadikan Konten: buat Content di Perencanaan + checklist dari template,
 * lalu ide menjadi Dipilih. Satu transaksi. Ditolak jika ide sudah punya konten.
 */
export async function convertIdeaToContent(
  input: unknown,
): Promise<ActionResult<{ contentId: string }>> {
  await requireAdmin();
  const parsed = convertIdeaSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { ideaId, pillarId, formatId, hookTypeId } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const idea = await tx.idea.findUnique({
        where: { id: ideaId },
        select: { title: true, status: true, content: { select: { id: true } } },
      });
      if (!idea) return fail("Ide tidak ditemukan");
      if (idea.content) return fail("Ide ini sudah dijadikan konten");
      if (idea.status === "ARCHIVED") return fail("Kembalikan ide dari arsip dulu sebelum dijadikan konten");

      const [pillar, format, hookType] = await Promise.all([
        tx.pillar.findUnique({ where: { id: pillarId }, select: { isActive: true } }),
        formatId ? tx.format.findUnique({ where: { id: formatId }, select: { isActive: true } }) : null,
        hookTypeId
          ? tx.hookType.findUnique({ where: { id: hookTypeId }, select: { isActive: true } })
          : null,
      ]);
      if (!pillar?.isActive) return fail("Pilar tidak ditemukan atau sudah nonaktif");
      if (formatId && !format?.isActive) return fail("Format tidak ditemukan atau sudah nonaktif");
      if (hookTypeId && !hookType?.isActive) {
        return fail("Tipe hook tidak ditemukan atau sudah nonaktif");
      }

      const content = await createContentWithChecklist(tx, {
        title: idea.title,
        pillarId,
        formatId,
        hookTypeId,
        ideaId,
      });
      await tx.idea.update({ where: { id: ideaId }, data: { status: "PICKED" } });
      return ok({ contentId: content.id });
    });

    if (result.ok) revalidateIdeaRoutes();
    return result;
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") return fail("Ide ini sudah dijadikan konten");
    if (code === "P2003") return fail("Format atau tipe hook tidak ditemukan");
    throw error;
  }
}
