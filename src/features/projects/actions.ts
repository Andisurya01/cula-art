"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { wibToUtc } from "@/lib/date";
import { requireAdmin } from "@/features/auth/dal";
import { createContentWithChecklist } from "@/features/contents/service";
import {
  idSchema,
  projectPhotoSchema,
  projectSchema,
  seriesSchema,
  type ProjectInput,
} from "./schema";
import { deleteProjectPhotoFiles } from "./photo-files";
import { revalidateProject } from "./revalidate";
import { buildSeriesItems, nextSeriesPart } from "./series";

const NOT_FOUND = "Proyek tidak ditemukan";

function toDate(value: string): Date | null {
  return value ? wibToUtc(value) : null;
}

function toProjectData(input: ProjectInput) {
  return {
    title: input.title,
    medium: input.medium,
    stage: input.stage,
    startDate: toDate(input.startDate),
    endDate: toDate(input.endDate),
    notes: input.notes || null,
  };
}

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const project = await db.project.create({ data: toProjectData(parsed.data) });

  revalidateProject(project.id);
  return ok({ id: project.id });
}

export async function updateProject(id: unknown, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await db.project.updateMany({
    where: { id: parsedId.data },
    data: toProjectData(parsed.data),
  });
  if (result.count === 0) return fail(NOT_FOUND);

  revalidateProject(parsedId.data, { contents: true });
  return ok();
}

/**
 * Hapus proyek. Foto ikut terhapus (Cascade) beserta file unggahannya; konten dan karya tetap ada
 * dengan projectId = null (SetNull).
 */
export async function deleteProject(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const projectId = parsedId.data;

  const storageKeys = await db.$transaction(async (tx) => {
    // Kunci baris proyek: unggahan foto yang bersamaan menunggu lalu gagal (FK), jadi tidak ada
    // file yang terlewat dari daftar hapus di bawah.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
    if (locked.length === 0) return null;
    const photos = await tx.projectPhoto.findMany({
      where: { projectId, storageKey: { not: null } },
      select: { storageKey: true },
    });
    await tx.project.delete({ where: { id: projectId } });
    return photos.map((p) => p.storageKey);
  });
  if (!storageKeys) return fail(NOT_FOUND);

  await deleteProjectPhotoFiles(storageKeys);

  // Tanpa id: halaman detail yang baru dihapus jangan dirender ulang (404 sekilas sebelum pindah).
  revalidateProject(undefined, { contents: true });
  return ok();
}

export async function addProjectPhoto(
  projectId: unknown,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const parsed = projectPhotoSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const project = await db.project.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!project) return fail(NOT_FOUND);

  const photo = await db.projectPhoto.create({
    data: {
      projectId: project.id,
      url: parsed.data.url,
      caption: parsed.data.caption || null,
      takenAt: toDate(parsed.data.takenAt),
    },
  });

  revalidateProject(project.id);
  return ok({ id: photo.id });
}

export async function deleteProjectPhoto(photoId: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(photoId);
  if (!parsedId.success) return fromZodError(parsedId.error);

  let photo: { projectId: string; storageKey: string | null };
  try {
    photo = await db.projectPhoto.delete({
      where: { id: parsedId.data },
      select: { projectId: true, storageKey: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("Foto tidak ditemukan");
    }
    throw error;
  }

  // File dihapus hanya setelah baris DB berhasil dihapus.
  await deleteProjectPhotoFiles([photo.storageKey]);

  revalidateProject(photo.projectId);
  return ok();
}

/**
 * Buat Seri: N konten "Judul dasar — Part i" di PLANNING (beserta checklist),
 * melanjutkan dari part terbesar yang sudah ada di proyek. Semua dalam satu transaksi.
 */
export async function createSeries(
  projectId: unknown,
  input: unknown,
): Promise<ActionResult<{ count: number; firstPart: number; lastPart: number }>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const parsed = seriesSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { count, baseTitle, pillarId } = parsed.data;
  const formatId = parsed.data.formatId || null;

  const [project, pillar, format] = await Promise.all([
    db.project.findUnique({ where: { id: parsedId.data }, select: { id: true } }),
    db.pillar.findUnique({ where: { id: pillarId }, select: { isActive: true } }),
    formatId ? db.format.findUnique({ where: { id: formatId }, select: { isActive: true } }) : null,
  ]);
  if (!project) return fail(NOT_FOUND);
  if (!pillar?.isActive) return fail("Pilar tidak ditemukan atau sudah nonaktif");
  if (formatId && !format?.isActive) return fail("Format tidak ditemukan atau sudah nonaktif");

  const items = await db.$transaction(async (tx) => {
    const existing = await tx.content.findMany({
      where: { projectId: project.id },
      select: { seriesPart: true },
    });
    const series = buildSeriesItems(
      baseTitle,
      nextSeriesPart(existing.map((c) => c.seriesPart)),
      count,
    );
    for (const item of series) {
      await createContentWithChecklist(tx, {
        title: item.title,
        pillarId,
        formatId,
        projectId: project.id,
        seriesPart: item.part,
      });
    }
    return series;
  });

  revalidateProject(project.id, { contents: true });
  return ok({
    count: items.length,
    firstPart: items[0]?.part ?? 0,
    lastPart: items[items.length - 1]?.part ?? 0,
  });
}
