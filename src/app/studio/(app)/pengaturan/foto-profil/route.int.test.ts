// Integrasi ke database test: Route Handler unggah foto profil (requireAdmin → receiveImageUpload →
// Setting.avatarKey → hapus file lama; file baru dibuang jika update DB gagal).

import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { IMAGE_ERRORS } from "@/lib/images";
import { routes } from "@/lib/routes";
import { getUploadDir, readStoredFile } from "@/lib/storage";
import { requireAdmin } from "@/features/auth/dal";
import { POST } from "./route";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type UploadBody = { ok: true; data: { avatarKey: string } } | { ok: false; error: string };

async function png(width = 64, height = 48): Promise<Blob> {
  const data = await sharp({ create: { width, height, channels: 3, background: { r: 180, g: 90, b: 40 } } })
    .png()
    .toBuffer();
  return new Blob([new Uint8Array(data)], { type: "image/png" });
}

function uploadRequest(file?: Blob, name = "foto.png"): Request {
  const body = new FormData();
  if (file) body.append("file", file, name);
  return new Request(`http://localhost${routes.studio.settingsProfilePhoto}`, { method: "POST", body });
}

async function uploadedFiles(): Promise<string[]> {
  try {
    return (await readdir(getUploadDir())).sort();
  } catch {
    return [];
  }
}

async function avatarKey(): Promise<string | null> {
  return (await db.setting.findUnique({ where: { id: "default" } }))?.avatarKey ?? null;
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("POST /studio/pengaturan/foto-profil", () => {
  it("PNG diproses ke WebP, avatarKey terisi, file ada, Galeri di-revalidate", async () => {
    const res = await POST(uploadRequest(await png()));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as UploadBody;
    expect(body.ok).toBe(true);
    if (!body.ok) return;

    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(await avatarKey()).toBe(body.data.avatarKey);
    const file = await readStoredFile(body.data.avatarKey);
    expect(file).not.toBeNull();
    const meta = await sharp(file!).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 64, height: 48 });
    expect(revalidatePath).toHaveBeenCalledWith(routes.studio.settings);
    expect(revalidatePath).toHaveBeenCalledWith(routes.gallery.home, "layout");
  });

  it("mengganti foto menghapus file lama", async () => {
    const first = (await (await POST(uploadRequest(await png()))).json()) as UploadBody;
    const second = (await (await POST(uploadRequest(await png(30, 30)))).json()) as UploadBody;
    if (!first.ok || !second.ok) throw new Error("unggahan gagal");

    expect(second.data.avatarKey).not.toBe(first.data.avatarKey);
    expect(await avatarKey()).toBe(second.data.avatarKey);
    expect(await readStoredFile(first.data.avatarKey)).toBeNull();
    expect(await readStoredFile(second.data.avatarKey)).not.toBeNull();
  });

  it("file bukan gambar ditolak (422) tanpa mengubah foto atau menyimpan file", async () => {
    const ok = (await (await POST(uploadRequest(await png()))).json()) as UploadBody;
    if (!ok.ok) throw new Error("unggahan gagal");
    const before = await uploadedFiles();

    const text = new Blob(["<?php echo 'bukan foto'; ?>"], { type: "image/png" });
    const res = await POST(uploadRequest(text, "foto.png"));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: IMAGE_ERRORS.unsupported });
    expect(await avatarKey()).toBe(ok.data.avatarKey);
    expect(await uploadedFiles()).toEqual(before);
  });

  it("tanpa field file → 400", async () => {
    const res = await POST(uploadRequest());
    expect(res.status).toBe(400);
    expect(((await res.json()) as UploadBody).ok).toBe(false);
  });

  it("update DB gagal → file yang baru disimpan dibuang", async () => {
    const before = await uploadedFiles();
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("database mati"));
    await expect(POST(uploadRequest(await png()))).rejects.toThrow("database mati");
    spy.mockRestore();
    expect(await uploadedFiles()).toEqual(before);
    expect(await avatarKey()).toBeNull();
  });

  it("tanpa sesi admin: berhenti sebelum membaca atau menyimpan file", async () => {
    const before = await uploadedFiles();
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(POST(uploadRequest(await png()))).rejects.toThrow("NEXT_REDIRECT");
    expect(await uploadedFiles()).toEqual(before);
    expect(await avatarKey()).toBeNull();
  });
});
