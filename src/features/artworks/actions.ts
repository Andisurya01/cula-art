"use server";

// Server Action menu Karya (Studio). Setiap aksi: requireAdmin → Zod → DB → revalidate Studio + Galeri.
// Foto diunggah lewat Route Handler (src/app/studio/(app)/karya/[id]/foto/route.ts), bukan di sini.

import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/dal";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { formatWib } from "@/lib/date";
import { db } from "@/lib/db";
import { deleteFilesQuietly, generateStorageKey, readStoredFile, saveFile } from "@/lib/storage";
import {
  deleteBlockedReason,
  introducedProblems,
  isSameIdSet,
  orderWithCoverFirst,
  planSlugChange,
  publishProblems,
  type PublishState,
} from "./rules";
import {
  ALT_MAX_LENGTH,
  artworkContentsSchema,
  artworkDetailSchema,
  createArtworkSchema,
  fromProjectSchema,
  idSchema,
  imageAltSchema,
  imageProcessSchema,
  reorderImagesSchema,
  visibilitySchema,
  type ArtworkDetailInput,
} from "./schema";
import {
  getSlugOwners,
  isUniqueViolation,
  loadPublishState,
  revalidateArtwork,
  syncCover,
  uniqueSlugFromTitle,
} from "./service";

const NOT_FOUND = "Karya tidak ditemukan";
const IMAGE_NOT_FOUND = "Foto tidak ditemukan";
const SLUG_CONFLICT = "Slug bentrok dengan karya lain. Coba simpan lagi.";

type Tx = Prisma.TransactionClient;

function toArtworkData(d: ArtworkDetailInput) {
  return {
    title: d.title,
    summary: d.summary,
    description: d.description,
    medium: d.medium,
    year: d.year,
    widthCm: d.widthCm,
    heightCm: d.heightCm,
    depthCm: d.depthCm,
    materials: d.materials,
    weightGram: d.weightGram,
    projectId: d.projectId,
    availability: d.availability,
    priceIdr: d.priceIdr,
    showPrice: d.showPrice,
    isFeatured: d.isFeatured,
    featuredOrder: d.featuredOrder,
  };
}

function publishedGuardMessage(problems: string[]): string {
  return `Karya sedang terbit, jadi perubahan ini ditolak: ${problems.join(" ")} Kembalikan ke Draft dulu jika memang ingin mengubahnya.`;
}

/** Tolak perubahan yang membuat karya Terbit tidak lagi memenuhi syarat terbit. */
async function publishedGuard(
  artworkId: string,
  change: (state: PublishState) => PublishState,
): Promise<string | null> {
  const state = await loadPublishState(db, artworkId);
  if (!state || state.visibility !== "PUBLISHED") return null;
  const problems = introducedProblems(state, change(state));
  return problems.length > 0 ? publishedGuardMessage(problems) : null;
}

/** Tulis `order` = posisi di `ids`, hanya untuk baris yang berubah. */
async function applyImageOrder(tx: Tx, ids: string[], current: { id: string; order: number }[]) {
  const before = new Map(current.map((img) => [img.id, img.order]));
  for (const [order, id] of ids.entries()) {
    if (before.get(id) !== order) await tx.artworkImage.update({ where: { id }, data: { order } });
  }
}

// ---- Karya ----

/** "Karya baru": cukup judul → Draft dengan slug unik dari judul. */
export async function createArtwork(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createArtworkSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { title } = parsed.data;

  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      const slug = await uniqueSlugFromTitle(tx, title);
      const artwork = await tx.artwork.create({ data: { title, slug }, select: { id: true } });
      return artwork.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(SLUG_CONFLICT);
    throw error;
  }

  revalidateArtwork(id);
  return ok({ id });
}

/**
 * Simpan form detail. Slug: jika `autoSlug` dan karya belum pernah terbit, slug dibuat ulang dari judul;
 * selain itu slug dari input (validasi + unik). Slug lama dicatat di ArtworkSlugRedirect.
 */
export async function updateArtwork(id: unknown, input: unknown): Promise<ActionResult<{ slug: string }>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const parsed = artworkDetailSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const artworkId = parsedId.data;
  const data = parsed.data;

  const current = await db.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, slug: true, publishedAt: true, projectId: true },
  });
  if (!current) return fail(NOT_FOUND);

  if (data.projectId && data.projectId !== current.projectId) {
    const project = await db.project.findUnique({ where: { id: data.projectId }, select: { id: true } });
    if (!project) return fail("Proyek tidak ditemukan");
  }

  const guard = await publishedGuard(artworkId, (state) => ({
    ...state,
    title: data.title,
    medium: data.medium,
    year: data.year,
  }));
  if (guard) return fail(guard);

  let result: { ok: true; slug: string } | { ok: false; message: string };
  try {
    result = await db.$transaction(async (tx) => {
      const nextSlug =
        data.autoSlug && current.publishedAt === null
          ? await uniqueSlugFromTitle(tx, data.title, artworkId)
          : data.slug;
      const plan = planSlugChange({
        artworkId,
        current: current.slug,
        next: nextSlug,
        owners: await getSlugOwners(tx, nextSlug),
      });
      if (plan.kind === "invalid") return { ok: false, message: plan.message };

      if (plan.kind === "change" && plan.removeRedirect) {
        await tx.artworkSlugRedirect.delete({ where: { oldSlug: plan.removeRedirect } });
      }
      await tx.artwork.update({
        where: { id: artworkId },
        data: { ...toArtworkData(data), ...(plan.kind === "change" ? { slug: plan.slug } : {}) },
      });
      if (plan.kind === "change") {
        await tx.artworkSlugRedirect.upsert({
          where: { oldSlug: plan.addRedirect },
          create: { oldSlug: plan.addRedirect, artworkId },
          update: { artworkId },
        });
        return { ok: true, slug: plan.slug };
      }
      return { ok: true, slug: current.slug };
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(SLUG_CONFLICT);
    throw error;
  }
  if (!result.ok) return { ok: false, error: result.message, fieldErrors: { slug: [result.message] } };

  revalidateArtwork(artworkId, [current.projectId, data.projectId]);
  return ok({ slug: result.slug });
}

/**
 * Ubah status publikasi. Terbit hanya jika syarat terpenuhi (dicek di server); `publishedAt` diisi
 * saat pertama kali terbit dan tidak berubah saat terbit ulang.
 */
export async function setArtworkVisibility(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = visibilitySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, visibility } = parsed.data;

  const artwork = await db.artwork.findUnique({
    where: { id },
    select: {
      title: true,
      medium: true,
      year: true,
      visibility: true,
      publishedAt: true,
      projectId: true,
      images: { select: { id: true, alt: true, isProcess: true } },
    },
  });
  if (!artwork) return fail(NOT_FOUND);
  if (artwork.visibility === visibility) return ok();

  if (visibility === "PUBLISHED") {
    const problems = publishProblems(artwork);
    if (problems.length > 0) {
      return fail(`Belum bisa terbit: ${problems.map((p) => p.message).join(" ")}`);
    }
  }

  await db.artwork.update({
    where: { id },
    data: {
      visibility,
      ...(visibility === "PUBLISHED" && !artwork.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });

  revalidateArtwork(id, [artwork.projectId]);
  return ok();
}

/** Hapus karya beserta semua file fotonya. Karya Terjual ditolak (hanya boleh diarsipkan). */
export async function deleteArtwork(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const artworkId = parsedId.data;

  const artwork = await db.artwork.findUnique({
    where: { id: artworkId },
    select: { availability: true, projectId: true },
  });
  if (!artwork) return fail(NOT_FOUND);
  const blocked = deleteBlockedReason(artwork.availability);
  if (blocked) return fail(blocked);

  const keys = await db.$transaction(async (tx) => {
    const images = await tx.artworkImage.findMany({ where: { artworkId }, select: { storageKey: true } });
    const deleted = await tx.artwork.deleteMany({ where: { id: artworkId, availability: { not: "SOLD" } } });
    return deleted.count > 0 ? images.map((img) => img.storageKey) : null;
  });
  if (!keys) return fail("Karya tidak bisa dihapus (mungkin baru saja diubah). Muat ulang halaman.");
  await deleteFilesQuietly(keys);

  revalidateArtwork(undefined, [artwork.projectId]);
  return ok();
}

// ---- Foto ----

/** Ubah teks alternatif satu foto. */
export async function updateArtworkImageAlt(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = imageAltSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, alt } = parsed.data;

  const image = await db.artworkImage.findUnique({ where: { id }, select: { artworkId: true } });
  if (!image) return fail(IMAGE_NOT_FOUND);

  const guard = await publishedGuard(image.artworkId, (state) => ({
    ...state,
    images: state.images.map((img) => (img.id === id ? { ...img, alt } : img)),
  }));
  if (guard) return fail(guard);

  await db.artworkImage.update({ where: { id }, data: { alt } });
  revalidateArtwork(image.artworkId);
  return ok();
}

/** Tandai foto sebagai foto proses (bukan foto karya jadi) atau sebaliknya. Cover ikut disesuaikan. */
export async function setArtworkImageProcess(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = imageProcessSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, isProcess } = parsed.data;

  const image = await db.artworkImage.findUnique({ where: { id }, select: { artworkId: true } });
  if (!image) return fail(IMAGE_NOT_FOUND);

  const guard = await publishedGuard(image.artworkId, (state) => ({
    ...state,
    images: state.images.map((img) => (img.id === id ? { ...img, isProcess } : img)),
  }));
  if (guard) return fail(guard);

  await db.$transaction(async (tx) => {
    await tx.artworkImage.update({
      where: { id },
      data: { isProcess, ...(isProcess ? { isCover: false } : {}) },
    });
    await syncCover(tx, image.artworkId);
  });
  revalidateArtwork(image.artworkId);
  return ok();
}

/** Jadikan cover (hanya foto karya jadi); foto itu pindah ke urutan pertama. */
export async function setArtworkCover(imageId: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(imageId);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const id = parsedId.data;

  const image = await db.artworkImage.findUnique({ where: { id }, select: { artworkId: true, isProcess: true } });
  if (!image) return fail(IMAGE_NOT_FOUND);
  if (image.isProcess) return fail("Foto proses tidak bisa dijadikan cover. Pindahkan ke foto karya jadi dulu.");

  await db.$transaction(async (tx) => {
    const images = await tx.artworkImage.findMany({
      where: { artworkId: image.artworkId },
      select: { id: true, isCover: true, isProcess: true, order: true },
    });
    await tx.artworkImage.updateMany({
      where: { artworkId: image.artworkId, isCover: true, id: { not: id } },
      data: { isCover: false },
    });
    await tx.artworkImage.update({ where: { id }, data: { isCover: true } });
    await applyImageOrder(tx, orderWithCoverFirst(images, id), images);
  });
  revalidateArtwork(image.artworkId);
  return ok();
}

/** Simpan urutan foto: `imageIds` harus berisi tepat semua foto karya ini. */
export async function reorderArtworkImages(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderImagesSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { artworkId, imageIds } = parsed.data;

  const artwork = await db.artwork.findUnique({
    where: { id: artworkId },
    select: { images: { select: { id: true, order: true } } },
  });
  if (!artwork) return fail(NOT_FOUND);
  if (!isSameIdSet(imageIds, artwork.images.map((img) => img.id))) {
    return fail("Daftar foto sudah berubah. Muat ulang halaman lalu coba lagi.");
  }

  await db.$transaction(async (tx) => {
    await applyImageOrder(tx, imageIds, artwork.images);
    await syncCover(tx, artworkId);
  });
  revalidateArtwork(artworkId);
  return ok();
}

/** Hapus satu foto beserta filenya. */
export async function deleteArtworkImage(imageId: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(imageId);
  if (!parsedId.success) return fromZodError(parsedId.error);
  const id = parsedId.data;

  const image = await db.artworkImage.findUnique({ where: { id }, select: { artworkId: true, storageKey: true } });
  if (!image) return fail(IMAGE_NOT_FOUND);

  const guard = await publishedGuard(image.artworkId, (state) => ({
    ...state,
    images: state.images.filter((img) => img.id !== id),
  }));
  if (guard) return fail(guard);

  await db.$transaction(async (tx) => {
    await tx.artworkImage.delete({ where: { id } });
    await syncCover(tx, image.artworkId);
  });
  await deleteFilesQuietly([image.storageKey]);

  revalidateArtwork(image.artworkId);
  return ok();
}

// ---- Video proses ----

/**
 * Ganti daftar video proses (urutan = posisi di `contentIds`). Konten baru wajib berstatus Posted;
 * konten yang sudah terhubung tetap boleh dipertahankan walau stage-nya berubah.
 */
export async function setArtworkContents(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = artworkContentsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { artworkId, contentIds } = parsed.data;

  const artwork = await db.artwork.findUnique({
    where: { id: artworkId },
    select: { contents: { select: { contentId: true } } },
  });
  if (!artwork) return fail(NOT_FOUND);

  const linked = new Set(artwork.contents.map((c) => c.contentId));
  const contents = await db.content.findMany({
    where: { id: { in: contentIds } },
    select: { id: true, stage: true },
  });
  if (contents.length !== contentIds.length) return fail("Konten tidak ditemukan. Muat ulang halaman.");
  if (contents.some((c) => c.stage !== "POSTED" && !linked.has(c.id))) {
    return fail("Hanya konten berstatus Posted yang bisa dipilih sebagai video proses.");
  }

  await db.$transaction([
    db.artworkContent.deleteMany({ where: { artworkId } }),
    db.artworkContent.createMany({
      data: contentIds.map((contentId, order) => ({ artworkId, contentId, order })),
    }),
  ]);
  revalidateArtwork(artworkId);
  return ok();
}

// ---- Dari proyek ----

/**
 * Buat karya Draft dari proyek: judul, medium, tahun (dari tanggal selesai/mulai, WIB), proyek asal,
 * dan foto progres unggahan terpilih (`photoIds`) disalin sebagai foto proses. File disalin ke key
 * baru, jadi menghapus foto karya tidak menghapus foto proyek (dan sebaliknya). Foto URL eksternal dilewati.
 * Input: `{ projectId: string; photoIds?: string[] }`. Hasil: id karya baru.
 */
export async function createArtworkFromProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = fromProjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { projectId, photoIds = [] } = parsed.data;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      medium: true,
      startDate: true,
      endDate: true,
      photos: {
        where: { id: { in: photoIds }, storageKey: { not: null } },
        orderBy: [{ takenAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        select: { storageKey: true, width: true, height: true, caption: true },
      },
    },
  });
  if (!project) return fail("Proyek tidak ditemukan");

  const yearSource = project.endDate ?? project.startDate;
  const year = yearSource ? Number(formatWib(yearSource, "yyyy")) : null;

  const copies: { storageKey: string; width: number; height: number; alt: string }[] = [];
  let artworkId: string;
  try {
    for (const photo of project.photos) {
      if (!photo.storageKey) continue;
      const data = await readStoredFile(photo.storageKey);
      if (!data) continue; // file hilang dari disk: lewati, jangan gagalkan semuanya
      let { width, height } = photo;
      if (!width || !height) {
        const meta = await sharp(data).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      }
      if (!width || !height) continue;
      const storageKey = generateStorageKey("webp");
      await saveFile(storageKey, data);
      copies.push({ storageKey, width, height, alt: (photo.caption ?? "").trim().slice(0, ALT_MAX_LENGTH) });
    }

    artworkId = await db.$transaction(async (tx) => {
      const slug = await uniqueSlugFromTitle(tx, project.title);
      const artwork = await tx.artwork.create({
        data: {
          title: project.title,
          slug,
          medium: project.medium,
          year,
          projectId: project.id,
          images: {
            create: copies.map((copy, order) => ({ ...copy, order, isProcess: true, isCover: false })),
          },
        },
        select: { id: true },
      });
      return artwork.id;
    });
  } catch (error) {
    await deleteFilesQuietly(copies.map((c) => c.storageKey));
    if (isUniqueViolation(error)) return fail(SLUG_CONFLICT);
    throw error;
  }

  revalidateArtwork(artworkId, [project.id]);
  return ok({ id: artworkId });
}
