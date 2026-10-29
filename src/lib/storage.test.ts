import { rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/media/[...key]/route";
import { saveUploadedImage } from "./images";
import {
  deleteFile,
  generateStorageKey,
  getUploadDir,
  isValidStorageKey,
  readStoredFile,
  resolveStoragePath,
  saveFile,
} from "./storage";

afterAll(async () => {
  await rm(getUploadDir(), { recursive: true, force: true });
});

function media(...segments: string[]) {
  return GET(new Request("http://localhost/media/x"), { params: Promise.resolve({ key: segments }) });
}

describe("storage", () => {
  it("test memakai folder unggahan khusus test", () => {
    expect(getUploadDir()).toBe(path.resolve(process.env.UPLOAD_DIR!));
    expect(getUploadDir()).toMatch(/\.test-uploads[\\/]\d+$/);
  });

  it("key acak 32 hex + ekstensi", () => {
    const key = generateStorageKey("webp");
    expect(key).toMatch(/^[a-f0-9]{32}\.webp$/);
    expect(generateStorageKey("webp")).not.toBe(key);
  });

  it.each([
    "../.env",
    "..\\.env",
    "../../etc/passwd",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "%2e%2e%2f.env",
    "abc.webp",
    `${"a".repeat(32)}.webp/../x`,
    `${"A".repeat(32)}.webp`,
    `${"a".repeat(32)}.svg`,
    `${"a".repeat(32)}.webp.tmp`,
  ])("path traversal / key asing ditolak: %s", (key) => {
    expect(isValidStorageKey(key)).toBe(false);
    expect(resolveStoragePath(key)).toBeNull();
  });

  it("simpan, baca, hapus (hapus file yang tidak ada tidak error)", async () => {
    const key = generateStorageKey("webp");
    await saveFile(key, new Uint8Array([1, 2, 3]));
    expect(await readStoredFile(key)).toEqual(Buffer.from([1, 2, 3]));
    await deleteFile(key);
    expect(await readStoredFile(key)).toBeNull();
    await expect(deleteFile(key)).resolves.toBeUndefined();
  });

  it("saveUploadedImage: foto diproses, disimpan dengan nama acak", async () => {
    const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#0af" } }).png().toBuffer();
    const stored = await saveUploadedImage(new Blob([new Uint8Array(png)], { type: "image/png" }));
    expect(stored).toMatchObject({ width: 30, height: 20 });
    expect(isValidStorageKey(stored.storageKey)).toBe(true);
    const saved = await readStoredFile(stored.storageKey);
    expect((await sharp(saved!).metadata()).format).toBe("webp");
  });
});

describe("GET /media/[...key]", () => {
  it("file ada → 200, tipe WebP, cache immutable 1 tahun", async () => {
    const key = generateStorageKey("webp");
    await saveFile(key, new Uint8Array([9, 9, 9]));
    const res = await media(key);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([9, 9, 9]));
  });

  it("path traversal dan key tidak dikenal → 404", async () => {
    for (const segments of [["..", ".env"], ["..", "..", "package.json"], ["%2e%2e", ".env"], ["sub", generateStorageKey("webp")]]) {
      expect((await media(...segments)).status).toBe(404);
    }
    expect((await media(generateStorageKey("webp"))).status).toBe(404);
  });
});
