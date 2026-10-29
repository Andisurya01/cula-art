// Integrasi: Route Handler unggah foto progres (sharp → baris + file), hapus foto/proyek
// menghapus file, dan constraint "url atau storageKey".

import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { POST } from "@/app/studio/(app)/proyek/[id]/foto/route";
import { requireAdmin } from "@/features/auth/dal";
import { wibToUtc } from "@/lib/date";
import { getUploadDir, readStoredFile } from "@/lib/storage";
import { db, resetDatabase } from "@/test/db";
import { deleteProject, deleteProjectPhoto } from "./actions";
import { projectPhotoUploadUrl } from "./photo";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type UploadBody = { ok: true; data: { id: string; storageKey: string; width: number; height: number } } | { ok: false; error: string };

async function image(format: "png" | "jpeg", width: number, height: number): Promise<Buffer> {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 180, g: 90, b: 60 } } });
  return format === "png" ? base.png().toBuffer() : base.jpeg().toBuffer();
}

const HEIC = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  Buffer.from("ftypheic", "latin1"),
  Buffer.alloc(64),
]);

function uploadRequest(projectId: string, file: Blob | null, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append("file", file, "foto.jpg");
  return new Request(`http://localhost${projectPhotoUploadUrl(projectId)}`, {
    method: "POST",
    body: form,
  });
}

async function upload(projectId: string, file: Blob | null, fields?: Record<string, string>) {
  const res = await POST(uploadRequest(projectId, file, fields), {
    params: Promise.resolve({ id: projectId }),
  });
  return { res, body: (await res.json()) as UploadBody };
}

async function uploadOk(projectId: string, fields?: Record<string, string>) {
  const { res, body } = await upload(projectId, new Blob([new Uint8Array(await image("png", 64, 48))]), fields);
  expect(res.status).toBe(200);
  if (!body.ok) throw new Error(body.error);
  return body.data;
}

/** File .webp yang ada di UPLOAD_DIR (folder bersama satu proses test). */
async function storedFiles(): Promise<string[]> {
  try {
    return (await readdir(getUploadDir())).filter((name) => name.endsWith(".webp")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function project(title = "Patung kepala naga") {
  return db.project.create({ data: { title, medium: "CLAY" } });
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("POST /studio/proyek/[id]/foto", () => {
  it("PNG → baris ProjectPhoto (storageKey, ukuran, caption, tanggal) + file WebP", async () => {
    const p = await project();
    const png = await image("png", 640, 480);
    const { res, body } = await upload(p.id, new Blob([new Uint8Array(png)], { type: "image/png" }), {
      caption: "  Armature selesai ",
      takenAt: "2026-10-20",
    });

    expect(requireAdmin).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    if (!body.ok) throw new Error(body.error);
    expect(body.data).toMatchObject({ width: 640, height: 480 });

    const row = await db.projectPhoto.findUniqueOrThrow({ where: { id: body.data.id } });
    expect(row).toMatchObject({
      projectId: p.id,
      url: null,
      storageKey: body.data.storageKey,
      width: 640,
      height: 480,
      caption: "Armature selesai",
    });
    expect(row.takenAt?.toISOString()).toBe(wibToUtc("2026-10-20").toISOString());
    expect(row.storageKey).toMatch(/^[a-f0-9]{32}\.webp$/);

    const file = await readStoredFile(row.storageKey!);
    expect(file).not.toBeNull();
    expect((await sharp(file!).metadata()).format).toBe("webp");
    expect(revalidatePath).toHaveBeenCalledWith(`/studio/proyek/${p.id}`);
  });

  it("JPEG besar dikecilkan ke sisi terpanjang 2400 px; caption/tanggal kosong → null", async () => {
    const p = await project();
    const jpeg = await image("jpeg", 3000, 1500);
    const { res, body } = await upload(p.id, new Blob([new Uint8Array(jpeg)]), { caption: "", takenAt: "" });
    expect(res.status).toBe(200);
    if (!body.ok) throw new Error(body.error);

    const row = await db.projectPhoto.findUniqueOrThrow({ where: { id: body.data.id } });
    expect(row).toMatchObject({ width: 2400, height: 1200, caption: null, takenAt: null });
  });

  it("HEIC ditolak dengan pesan jelas; tidak ada baris atau file", async () => {
    const p = await project();
    const before = await storedFiles();
    const { res, body } = await upload(p.id, new Blob([HEIC]));
    expect(res.status).toBe(422);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.error).toContain("HEIC");
    expect(await db.projectPhoto.count()).toBe(0);
    expect(await storedFiles()).toEqual(before);
  });

  it("file teks ditolak walau bernama .jpg", async () => {
    const p = await project();
    const before = await storedFiles();
    const { res, body } = await upload(p.id, new Blob(["bukan gambar"], { type: "image/jpeg" }));
    expect(res.status).toBe(422);
    if (!body.ok) expect(body.error).toContain("Format tidak didukung");
    expect(await db.projectPhoto.count()).toBe(0);
    expect(await storedFiles()).toEqual(before);
  });

  it("proyek tidak ada → 404 tanpa menyimpan file", async () => {
    const before = await storedFiles();
    const png = await image("png", 32, 32);
    const { res, body } = await upload("tidak-ada", new Blob([new Uint8Array(png)]));
    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "Proyek tidak ditemukan" });
    expect(await storedFiles()).toEqual(before);
  });

  it("tanggal tidak valid → 400, file yang sudah diproses dibuang", async () => {
    const p = await project();
    const before = await storedFiles();
    const png = await image("png", 32, 32);
    const { res, body } = await upload(p.id, new Blob([new Uint8Array(png)]), { takenAt: "2026-13-45" });
    expect(res.status).toBe(400);
    if (!body.ok) expect(body.error).toBe("Tanggal tidak valid");
    expect(await db.projectPhoto.count()).toBe(0);
    expect(await storedFiles()).toEqual(before);
  });

  it("tanpa field file → 400", async () => {
    const p = await project();
    const { res, body } = await upload(p.id, null, { caption: "x" });
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });
});

describe("hapus foto dan proyek menghapus file unggahan", () => {
  it("hapus foto unggahan menghapus baris lalu filenya", async () => {
    const p = await project();
    const photo = await uploadOk(p.id);
    expect(await readStoredFile(photo.storageKey)).not.toBeNull();

    expect(await deleteProjectPhoto(photo.id)).toEqual({ ok: true, data: undefined });
    expect(await db.projectPhoto.count()).toBe(0);
    expect(await readStoredFile(photo.storageKey)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/studio/proyek/${p.id}`);
  });

  it("hapus foto URL lama tetap berjalan; foto yang tidak ada → gagal", async () => {
    const p = await project();
    const photo = await db.projectPhoto.create({
      data: { projectId: p.id, url: "https://contoh.id/progres.jpg" },
    });
    expect((await deleteProjectPhoto(photo.id)).ok).toBe(true);
    expect(await deleteProjectPhoto(photo.id)).toMatchObject({ ok: false, error: "Foto tidak ditemukan" });
  });

  it("hapus proyek menghapus file semua foto unggahannya; konten dan karya tetap ada", async () => {
    const p = await project();
    const other = await project("Proyek lain");
    const a = await uploadOk(p.id);
    const b = await uploadOk(p.id);
    const keep = await uploadOk(other.id);
    await db.projectPhoto.create({ data: { projectId: p.id, url: "https://contoh.id/lama.jpg" } });
    const pillar = await db.pillar.create({ data: { name: "Proses", color: "#000000" } });
    const content = await db.content.create({
      data: { title: "Part 1", pillarId: pillar.id, projectId: p.id, seriesPart: 1 },
    });
    const artwork = await db.artwork.create({
      data: { slug: "naga", title: "Naga", projectId: p.id },
    });

    expect(await deleteProject(p.id)).toEqual({ ok: true, data: undefined });

    expect(await db.project.findUnique({ where: { id: p.id } })).toBeNull();
    expect(await db.projectPhoto.findMany({ select: { id: true } })).toEqual([{ id: keep.id }]);
    expect(await readStoredFile(a.storageKey)).toBeNull();
    expect(await readStoredFile(b.storageKey)).toBeNull();
    expect(await readStoredFile(keep.storageKey)).not.toBeNull();
    expect((await db.content.findUniqueOrThrow({ where: { id: content.id } })).projectId).toBeNull();
    expect((await db.artwork.findUniqueOrThrow({ where: { id: artwork.id } })).projectId).toBeNull();
  });

  it("file yang masih dipakai foto karya tidak ikut terhapus", async () => {
    const p = await project();
    const photo = await uploadOk(p.id);
    // Seandainya karya memakai key yang sama (bukan salinan file): foto Galeri tidak boleh hilang.
    await db.artwork.create({
      data: {
        slug: "naga",
        title: "Naga",
        images: { create: [{ storageKey: photo.storageKey, width: 64, height: 48, alt: "Naga" }] },
      },
    });

    expect((await deleteProject(p.id)).ok).toBe(true);
    expect(await db.projectPhoto.count()).toBe(0);
    expect(await readStoredFile(photo.storageKey)).not.toBeNull();
  });

  it("hapus proyek yang tidak ada → gagal", async () => {
    expect(await deleteProject("tidak-ada")).toEqual({ ok: false, error: "Proyek tidak ditemukan" });
  });
});

describe("constraint ProjectPhoto", () => {
  it("url atau storageKey wajib ada (CHECK di DB)", async () => {
    const p = await project();
    await expect(db.projectPhoto.create({ data: { projectId: p.id, caption: "kosong" } })).rejects.toThrow();
  });
});
