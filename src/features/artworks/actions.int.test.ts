// Integrasi ke database test: aksi Karya (slug + redirect, syarat terbit, hapus file, dari proyek).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { generateStorageKey, readStoredFile, saveFile } from "@/lib/storage";
import {
  createArtwork,
  createArtworkFromProject,
  deleteArtwork,
  deleteArtworkImage,
  reorderArtworkImages,
  setArtworkContents,
  setArtworkCover,
  setArtworkImageProcess,
  setArtworkVisibility,
  updateArtwork,
  updateArtworkImageAlt,
} from "./actions";
import { SLUG_ERRORS } from "./rules";
import type { ArtworkDetailFormValues } from "./schema";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetDatabase);

function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`Aksi gagal: ${result.error}`);
  return result.data;
}

async function storedFile(content = "foto"): Promise<string> {
  const key = generateStorageKey("webp");
  await saveFile(key, new TextEncoder().encode(content));
  return key;
}

async function addImage(artworkId: string, data: { alt?: string; isProcess?: boolean; isCover?: boolean; order?: number } = {}) {
  return db.artworkImage.create({
    data: { artworkId, storageKey: await storedFile(), width: 800, height: 1000, alt: "Foto", ...data },
  });
}

async function form(artworkId: string, patch: Partial<ArtworkDetailFormValues> = {}): Promise<ArtworkDetailFormValues> {
  const a = await db.artwork.findUniqueOrThrow({ where: { id: artworkId } });
  return {
    title: a.title,
    autoSlug: false,
    slug: a.slug,
    summary: a.summary ?? "",
    description: a.description ?? "",
    medium: a.medium,
    year: a.year?.toString() ?? "",
    widthCm: "",
    heightCm: "",
    depthCm: "",
    materials: "",
    weightGram: "",
    projectId: a.projectId,
    availability: a.availability,
    priceIdr: "",
    showPrice: false,
    isFeatured: false,
    featuredOrder: "",
    ...patch,
  };
}

async function redirects() {
  return (await db.artworkSlugRedirect.findMany({ orderBy: { oldSlug: "asc" } })).map((r) => [r.oldSlug, r.artworkId]);
}

describe("buat karya + slug", () => {
  it("slug unik dari judul, juga menghindari slug lama (redirect) karya lain", async () => {
    const a = unwrap(await createArtwork({ title: "Kepala Naga" }));
    const b = unwrap(await createArtwork({ title: "Kepala Naga" }));
    expect((await db.artwork.findUniqueOrThrow({ where: { id: a.id } })).slug).toBe("kepala-naga");
    expect((await db.artwork.findUniqueOrThrow({ where: { id: b.id } })).slug).toBe("kepala-naga-2");

    await db.artworkSlugRedirect.create({ data: { oldSlug: "kepala-naga-3", artworkId: a.id } });
    const c = unwrap(await createArtwork({ title: "Kepala  naga!" }));
    const created = await db.artwork.findUniqueOrThrow({ where: { id: c.id } });
    expect(created).toMatchObject({ slug: "kepala-naga-4", visibility: "DRAFT", publishedAt: null });
  });

  it("judul kosong ditolak", async () => {
    const result = await createArtwork({ title: "   " });
    expect(result.ok).toBe(false);
  });

  it("ganti slug manual → redirect; kembali ke slug lama → redirect dihapus", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    expect(unwrap(await updateArtwork(id, await form(id, { slug: "naga-merah" })))).toEqual({ slug: "naga-merah" });
    expect(await redirects()).toEqual([["naga", id]]);

    expect(unwrap(await updateArtwork(id, await form(id, { slug: "naga" })))).toEqual({ slug: "naga" });
    expect(await redirects()).toEqual([["naga-merah", id]]);
  });

  it("slug atau slug lama milik karya lain ditolak dengan pesan jelas", async () => {
    const a = unwrap(await createArtwork({ title: "Naga" }));
    const b = unwrap(await createArtwork({ title: "Kucing" }));
    unwrap(await updateArtwork(a.id, await form(a.id, { slug: "naga-hijau" }))); // "naga" jadi redirect milik a

    const taken = await updateArtwork(b.id, await form(b.id, { slug: "naga-hijau" }));
    expect(taken).toMatchObject({ ok: false, error: SLUG_ERRORS.takenByArtwork, fieldErrors: { slug: [SLUG_ERRORS.takenByArtwork] } });
    const redirected = await updateArtwork(b.id, await form(b.id, { slug: "naga" }));
    expect(redirected).toMatchObject({ ok: false, error: SLUG_ERRORS.takenByRedirect });
    expect((await db.artwork.findUniqueOrThrow({ where: { id: b.id } })).slug).toBe("kucing");
  });

  it("slug otomatis ikut judul selama belum pernah terbit; setelah terbit hanya manual", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    expect(unwrap(await updateArtwork(id, await form(id, { title: "Naga Merah", autoSlug: true })))).toEqual({
      slug: "naga-merah",
    });

    await db.artwork.update({ where: { id }, data: { publishedAt: new Date() } });
    expect(unwrap(await updateArtwork(id, await form(id, { title: "Naga Biru", autoSlug: true })))).toEqual({
      slug: "naga-merah",
    });
    expect(unwrap(await updateArtwork(id, await form(id, { slug: "naga-biru" })))).toEqual({ slug: "naga-biru" });
    expect(await redirects()).toEqual([
      ["naga", id],
      ["naga-merah", id],
    ]);
  });

  it("menyimpan semua field form", async () => {
    const project = await db.project.create({ data: { title: "Proyek", medium: "CLAY" } });
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    unwrap(
      await updateArtwork(
        id,
        await form(id, {
          summary: "Naga kecil dari clay.",
          description: "Cerita panjang",
          medium: "CLAY",
          year: "2026",
          widthCm: "12,5",
          heightCm: "20",
          depthCm: "8",
          materials: "Clay air dry",
          weightGram: "450",
          projectId: project.id,
          availability: "AVAILABLE",
          priceIdr: "1.500.000",
          showPrice: true,
          isFeatured: true,
          featuredOrder: "2",
        }),
      ),
    );
    expect(await db.artwork.findUniqueOrThrow({ where: { id } })).toMatchObject({
      summary: "Naga kecil dari clay.",
      medium: "CLAY",
      year: 2026,
      widthCm: 12.5,
      depthCm: 8,
      weightGram: 450,
      projectId: project.id,
      availability: "AVAILABLE",
      priceIdr: 1_500_000,
      showPrice: true,
      isFeatured: true,
      featuredOrder: 2,
    });
  });
});

describe("publikasi", () => {
  it("terbit ditolak jika syarat belum terpenuhi, diterima jika lengkap; publishedAt tetap saat terbit ulang", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const rejected = await setArtworkVisibility({ id, visibility: "PUBLISHED" });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toMatch(/Medium[^]*Tahun[^]*foto karya jadi/);

    await db.artwork.update({ where: { id }, data: { medium: "CLAY", year: 2026 } });
    const image = await addImage(id, { alt: "" });
    expect((await setArtworkVisibility({ id, visibility: "PUBLISHED" })).ok).toBe(false); // alt kosong

    unwrap(await updateArtworkImageAlt({ id: image.id, alt: "Naga hijau dari samping" }));
    unwrap(await setArtworkVisibility({ id, visibility: "PUBLISHED" }));
    const first = await db.artwork.findUniqueOrThrow({ where: { id } });
    expect(first.visibility).toBe("PUBLISHED");
    expect(first.publishedAt).toBeInstanceOf(Date);

    unwrap(await setArtworkVisibility({ id, visibility: "ARCHIVED" }));
    unwrap(await setArtworkVisibility({ id, visibility: "PUBLISHED" }));
    const again = await db.artwork.findUniqueOrThrow({ where: { id } });
    expect(again.publishedAt?.getTime()).toBe(first.publishedAt?.getTime());
  });

  it("karya Terbit tidak boleh kehilangan syarat terbit (medium, foto terakhir, alt)", async () => {
    const artwork = await db.artwork.create({
      data: { title: "Naga", slug: "naga", medium: "CLAY", year: 2026, visibility: "PUBLISHED", publishedAt: new Date() },
    });
    const image = await addImage(artwork.id, { isCover: true });

    expect((await updateArtwork(artwork.id, await form(artwork.id, { medium: null }))).ok).toBe(false);
    expect((await updateArtworkImageAlt({ id: image.id, alt: "" })).ok).toBe(false);
    expect((await setArtworkImageProcess({ id: image.id, isProcess: true })).ok).toBe(false);
    expect((await deleteArtworkImage(image.id)).ok).toBe(false);
    expect(await db.artworkImage.count()).toBe(1);

    unwrap(await setArtworkVisibility({ id: artwork.id, visibility: "DRAFT" }));
    unwrap(await deleteArtworkImage(image.id));
  });
});

describe("foto", () => {
  it("cover hanya foto karya jadi dan pindah ke urutan pertama; foto proses melepas cover", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const a = await addImage(id, { order: 0, isCover: true });
    const b = await addImage(id, { order: 1 });
    const p = await addImage(id, { order: 2, isProcess: true });

    expect((await setArtworkCover(p.id)).ok).toBe(false);
    unwrap(await setArtworkCover(b.id));
    const rows = await db.artworkImage.findMany({ where: { artworkId: id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => [r.id, r.order, r.isCover])).toEqual([
      [b.id, 0, true],
      [a.id, 1, false],
      [p.id, 2, false],
    ]);

    unwrap(await setArtworkImageProcess({ id: b.id, isProcess: true }));
    const after = await db.artworkImage.findMany({ where: { artworkId: id, isCover: true } });
    expect(after.map((r) => r.id)).toEqual([a.id]);
  });

  it("urutan harus berisi tepat semua foto", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const a = await addImage(id, { order: 0 });
    const b = await addImage(id, { order: 1 });
    expect((await reorderArtworkImages({ artworkId: id, imageIds: [a.id] })).ok).toBe(false);
    unwrap(await reorderArtworkImages({ artworkId: id, imageIds: [b.id, a.id] }));
    const rows = await db.artworkImage.findMany({ where: { artworkId: id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it("hapus foto menghapus filenya; cover pindah ke foto berikutnya", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const a = await addImage(id, { order: 0, isCover: true });
    const b = await addImage(id, { order: 1 });
    unwrap(await deleteArtworkImage(a.id));
    expect(await readStoredFile(a.storageKey)).toBeNull();
    expect(await readStoredFile(b.storageKey)).not.toBeNull();
    expect((await db.artworkImage.findUniqueOrThrow({ where: { id: b.id } })).isCover).toBe(true);
  });
});

describe("hapus karya", () => {
  it("menghapus semua file fotonya dan slug lama", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const images = [await addImage(id), await addImage(id, { isProcess: true })];
    await db.artworkSlugRedirect.create({ data: { oldSlug: "naga-lama", artworkId: id } });

    unwrap(await deleteArtwork(id));
    expect(await db.artwork.count()).toBe(0);
    expect(await db.artworkSlugRedirect.count()).toBe(0);
    for (const img of images) expect(await readStoredFile(img.storageKey)).toBeNull();
  });

  it("karya Terjual tidak bisa dihapus", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const image = await addImage(id);
    await db.artwork.update({ where: { id }, data: { availability: "SOLD" } });
    const result = await deleteArtwork(id);
    expect(result).toMatchObject({ ok: false });
    expect(await db.artwork.count()).toBe(1);
    expect(await readStoredFile(image.storageKey)).not.toBeNull();
  });
});

describe("video proses", () => {
  async function content(title: string, stage: "POSTED" | "EDITING") {
    const pillar = await db.pillar.upsert({ where: { name: "Proses" }, create: { name: "Proses", color: "#000" }, update: {} });
    return db.content.create({ data: { title, stage, pillarId: pillar.id } });
  }

  it("hanya konten Posted; urutan disimpan; konten yang sudah terhubung boleh dipertahankan", async () => {
    const { id } = unwrap(await createArtwork({ title: "Naga" }));
    const posted1 = await content("Part 1", "POSTED");
    const posted2 = await content("Part 2", "POSTED");
    const editing = await content("Part 3", "EDITING");

    const rejected = await setArtworkContents({ artworkId: id, contentIds: [posted1.id, editing.id] });
    expect(rejected.ok).toBe(false);

    unwrap(await setArtworkContents({ artworkId: id, contentIds: [posted2.id, posted1.id] }));
    const rows = await db.artworkContent.findMany({ where: { artworkId: id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => r.contentId)).toEqual([posted2.id, posted1.id]);

    await db.content.update({ where: { id: posted1.id }, data: { stage: "EDITING" } });
    unwrap(await setArtworkContents({ artworkId: id, contentIds: [posted1.id] }));
    expect(await db.artworkContent.count()).toBe(1);
  });
});

describe("createArtworkFromProject", () => {
  it("Draft dari proyek: judul, medium, tahun WIB, foto unggahan disalin ke file baru (URL dilewati)", async () => {
    const project = await db.project.create({
      data: {
        title: "Patung kepala naga",
        medium: "CLAY",
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-12-31T18:00:00Z"), // 1 Jan 2026 01.00 WIB
      },
    });
    const uploaded = await db.projectPhoto.create({
      data: { projectId: project.id, storageKey: await storedFile("isi-foto"), width: 600, height: 900, caption: "Armature" },
    });
    const external = await db.projectPhoto.create({ data: { projectId: project.id, url: "https://contoh.id/a.jpg" } });
    const unselected = await db.projectPhoto.create({
      data: { projectId: project.id, storageKey: await storedFile(), width: 10, height: 10 },
    });

    const { id } = unwrap(
      await createArtworkFromProject({ projectId: project.id, photoIds: [uploaded.id, external.id, "tidak-ada"] }),
    );
    const artwork = await db.artwork.findUniqueOrThrow({ where: { id }, include: { images: true } });
    expect(artwork).toMatchObject({
      title: "Patung kepala naga",
      slug: "patung-kepala-naga",
      medium: "CLAY",
      year: 2026,
      projectId: project.id,
      visibility: "DRAFT",
    });
    expect(artwork.images).toHaveLength(1);
    const [image] = artwork.images;
    expect(image).toMatchObject({ isProcess: true, isCover: false, width: 600, height: 900, alt: "Armature" });
    expect(image.storageKey).not.toBe(uploaded.storageKey);
    expect((await readStoredFile(image.storageKey))?.toString()).toBe("isi-foto");
    expect(unselected.id).toBeTruthy();

    // Menghapus foto karya tidak menghapus file foto proyek.
    unwrap(await deleteArtworkImage(image.id));
    expect(await readStoredFile(image.storageKey)).toBeNull();
    expect((await readStoredFile(uploaded.storageKey!))?.toString()).toBe("isi-foto");
  });

  it("tanpa foto dan tanpa tanggal → tahun kosong; proyek tidak ada → gagal", async () => {
    const project = await db.project.create({ data: { title: "Sketsa", medium: "DRAWING" } });
    const { id } = unwrap(await createArtworkFromProject({ projectId: project.id }));
    expect(await db.artwork.findUniqueOrThrow({ where: { id } })).toMatchObject({ year: null, medium: "DRAWING" });
    expect((await createArtworkFromProject({ projectId: "tidak-ada" })).ok).toBe(false);
  });
});
