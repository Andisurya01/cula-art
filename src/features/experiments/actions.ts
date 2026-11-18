"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import type { ExperimentVariant } from "@/lib/analytics/experiments";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routePatterns, routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import {
  concludeExperimentSchema,
  experimentIdSchema,
  experimentSchema,
  removeExperimentPostSchema,
  setExperimentPostSchema,
  updateExperimentSchema,
} from "./schema";

/** Daftar, semua detail eksperimen, dan detail post (kartu "Eksperimen" di sana). */
function revalidateExperiments() {
  revalidatePath(routes.studio.experiments);
  revalidatePath(routePatterns.experiment, "page");
  revalidatePath(routePatterns.post, "page");
}

function prismaErrorCode(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

const NOT_FOUND = "Eksperimen tidak ditemukan";
const CONCLUDED = "Eksperimen ini sudah disimpulkan. Buka lagi dulu untuk mengubah post.";

export async function createExperiment(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = experimentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const experiment = await db.experiment.create({ data: parsed.data, select: { id: true } });
  revalidateExperiments();
  return ok({ id: experiment.id });
}

/** Ubah isi eksperimen. Platform hanya boleh diganti selama belum ada post (E7: satu platform). */
export async function updateExperiment(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateExperimentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, ...data } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.experiment.findUnique({
      where: { id },
      select: { platform: true, _count: { select: { posts: true } } },
    });
    if (!existing) return fail(NOT_FOUND);
    if (existing.platform !== data.platform && existing._count.posts > 0) {
      return fail("Platform tidak bisa diganti karena eksperimen ini sudah punya post. Lepas semua post dulu.");
    }
    await tx.experiment.update({ where: { id }, data });
    return ok();
  });

  if (result.ok) revalidateExperiments();
  return result;
}

/**
 * Masukkan post tayang ke varian A/B, atau pindahkan ke varian lain (satu post satu varian per eksperimen).
 * Post wajib sudah tayang dan platformnya sama dengan eksperimen.
 */
export async function setExperimentPost(
  input: unknown,
): Promise<ActionResult<{ previous: ExperimentVariant | null }>> {
  await requireAdmin();
  const parsed = setExperimentPostSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { experimentId, postId, variant } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const experiment = await tx.experiment.findUnique({
        where: { id: experimentId },
        select: { platform: true, result: true },
      });
      if (!experiment) return fail(NOT_FOUND);
      if (experiment.result !== null) return fail(CONCLUDED);

      const post = await tx.post.findUnique({ where: { id: postId }, select: { platform: true, postedAt: true } });
      if (!post) return fail("Post tidak ditemukan");
      if (!post.postedAt) return fail("Post ini belum tayang. Hanya post yang sudah tayang yang bisa masuk eksperimen.");
      if (post.platform !== experiment.platform) {
        return fail(
          `Post ini di ${PLATFORM_LABELS[post.platform]}, sedangkan eksperimen ini di ${PLATFORM_LABELS[experiment.platform]}.`,
        );
      }

      const key = { experimentId_postId: { experimentId, postId } };
      const existing = await tx.experimentPost.findUnique({ where: key, select: { variant: true } });
      if (existing) {
        if (existing.variant !== variant) await tx.experimentPost.update({ where: key, data: { variant } });
      } else {
        await tx.experimentPost.create({ data: { experimentId, postId, variant } });
      }
      return ok({ previous: existing?.variant ?? null });
    });

    if (result.ok) revalidateExperiments();
    return result;
  } catch (error) {
    // Ditambahkan bersamaan dari tab lain (P2002) atau post/eksperimen terhapus di tengah jalan (P2003).
    const code = prismaErrorCode(error);
    if (code === "P2002") return fail("Post ini baru saja ditambahkan. Muat ulang halaman lalu coba lagi.");
    if (code === "P2003") return fail("Post atau eksperimen sudah tidak ada. Muat ulang halaman.");
    throw error;
  }
}

/** Lepas post dari eksperimen (post dan metriknya tidak terhapus). */
export async function removeExperimentPost(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = removeExperimentPostSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { experimentId, postId } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const experiment = await tx.experiment.findUnique({ where: { id: experimentId }, select: { result: true } });
    if (!experiment) return fail(NOT_FOUND);
    if (experiment.result !== null) return fail(CONCLUDED);
    const { count } = await tx.experimentPost.deleteMany({ where: { experimentId, postId } });
    if (count === 0) return fail("Post ini sudah tidak ada di eksperimen");
    return ok();
  });

  if (result.ok) revalidateExperiments();
  return result;
}

/** Simpan kesimpulan + catatan. Keputusan pengguna; usulan otomatis hanya nilai awal form. */
export async function concludeExperiment(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = concludeExperimentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, result, notes } = parsed.data;

  try {
    await db.experiment.update({
      where: { id },
      data: { result, notes: notes === "" ? null : notes, concludedAt: new Date() },
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return fail(NOT_FOUND);
    throw error;
  }
  revalidateExperiments();
  return ok();
}

/** Buka lagi: kembali berjalan (hasil dan waktu kesimpulan dikosongkan, catatan tetap). */
export async function reopenExperiment(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = experimentIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.experiment.update({ where: { id: parsed.data.id }, data: { result: null, concludedAt: null } });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return fail(NOT_FOUND);
    throw error;
  }
  revalidateExperiments();
  return ok();
}

/** Hapus eksperimen beserta hubungan post-nya (cascade). Post dan metriknya tetap ada. */
export async function deleteExperiment(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = experimentIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.experiment.delete({ where: { id: parsed.data.id } });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") return fail(NOT_FOUND);
    throw error;
  }
  revalidateExperiments();
  return ok();
}
