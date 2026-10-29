import "server-only";
// Penyimpanan file unggahan di disk (UPLOAD_DIR, default ./uploads). Satu-satunya modul yang
// menyentuh folder ini, supaya nanti bisa diganti penyimpanan S3-compatible.
// `turbopackIgnore`: path ditentukan saat runtime; tanpa penanda ini Turbopack menelusuri seluruh proyek.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Key = 32 karakter hex acak + ekstensi. Tanpa slash, titik ganda, atau huruf besar. */
const KEY_PATTERN = /^[a-f0-9]{32}\.(webp)$/;

const CONTENT_TYPES: Record<string, string> = { webp: "image/webp" };

export function getUploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "./uploads");
}

export function isValidStorageKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function generateStorageKey(extension: "webp"): string {
  return `${randomBytes(16).toString("hex")}.${extension}`;
}

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}

/** Path absolut file untuk key valid; null untuk key tidak valid atau di luar UPLOAD_DIR. */
export function resolveStoragePath(key: string): string | null {
  if (!isValidStorageKey(key)) return null;
  const dir = getUploadDir();
  const full = path.resolve(/*turbopackIgnore: true*/ dir, key);
  return full.startsWith(dir + path.sep) ? full : null;
}

function requirePath(key: string): string {
  const full = resolveStoragePath(key);
  if (!full) throw new Error(`Storage key tidak valid: ${key}`);
  return full;
}

/** Tulis atomik (file sementara lalu rename), jadi pembaca tidak pernah melihat file setengah jadi. */
export async function saveFile(key: string, data: Uint8Array): Promise<void> {
  const full = requirePath(key);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
  const temp = `${full}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ temp, data, { flag: "wx" });
  await rename(/*turbopackIgnore: true*/ temp, full);
}

/** Isi file, atau null jika key tidak valid / file tidak ada. */
export async function readStoredFile(key: string): Promise<Buffer | null> {
  const full = resolveStoragePath(key);
  if (!full) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ full);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Hapus file; file yang sudah tidak ada dianggap berhasil. */
export async function deleteFile(key: string): Promise<void> {
  const full = requirePath(key);
  try {
    await unlink(/*turbopackIgnore: true*/ full);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Hapus beberapa file tanpa menggagalkan aksi jika satu gagal (dicatat di log). */
export async function deleteFilesQuietly(keys: (string | null | undefined)[]): Promise<void> {
  await Promise.all(
    keys
      .filter((k): k is string => !!k)
      .map((k) => deleteFile(k).catch((error: unknown) => console.error("Gagal menghapus file", k, error))),
  );
}
