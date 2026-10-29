// Integrasi ke database test: Route Handler unggah foto karya.

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readStoredFile } from "@/lib/storage";
import { db, resetDatabase } from "@/test/db";
import { POST } from "./route";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetDatabase);

/** Foto PNG asli sebagai Blob (seperti kiriman browser). */
async function png(width = 40, height = 50): Promise<Blob> {
  const data = await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .png()
    .toBuffer();
  const bytes = new Uint8Array(data.length);
  bytes.set(data);
  return new Blob([bytes], { type: "image/png" });
}

function uploadRequest(file: Blob, fields: Record<string, string> = {}): Request {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  body.append("file", file, "foto.png");
  return new Request("http://localhost/studio/karya/x/foto", { method: "POST", body });
}

async function post(artworkId: string, file: Blob, fields?: Record<string, string>) {
  const response = await POST(uploadRequest(file, fields), { params: Promise.resolve({ id: artworkId }) });
  return { status: response.status, body: await response.json() };
}

describe("POST /studio/karya/[id]/foto", () => {
  it("menyimpan foto (WebP, ukuran asli), foto karya jadi pertama jadi cover, urutan bertambah", async () => {
    const artwork = await db.artwork.create({ data: { title: "Naga", slug: "naga" } });

    const first = await post(artwork.id, await png(40, 50));
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ ok: true, data: { width: 40, height: 50, alt: "", isCover: true, isProcess: false, order: 0 } });
    const stored = await readStoredFile(first.body.data.storageKey);
    expect(stored).not.toBeNull();
    expect((await sharp(stored!).metadata()).format).toBe("webp");

    const process = await post(artwork.id, await png(), { isProcess: "1" });
    expect(process.body).toMatchObject({ ok: true, data: { isProcess: true, isCover: false, order: 1 } });

    const rows = await db.artworkImage.findMany({ where: { artworkId: artwork.id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => [r.isProcess, r.isCover])).toEqual([
      [false, true],
      [true, false],
    ]);
  });

  it("menolak file bukan gambar (dicek dari isi file) tanpa menyimpan apa pun", async () => {
    const artwork = await db.artwork.create({ data: { title: "Naga", slug: "naga" } });
    const fake = new Blob([new TextEncoder().encode("bukan gambar, hanya teks")], { type: "image/png" });
    const result = await post(artwork.id, fake);
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ ok: false, error: expect.stringContaining("Format tidak didukung") });
    expect(await db.artworkImage.count()).toBe(0);
  });

  it("karya tidak ada → 404", async () => {
    const result = await post("tidak-ada", await png());
    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
  });
});
