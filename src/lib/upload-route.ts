import "server-only";
// Helper Route Handler unggah foto (Studio). Server Action dibatasi 1 MB dan tidak punya progres,
// jadi unggahan memakai Route Handler + XHR (lihat upload-client.ts). Setiap handler tetap wajib
// diawali `await requireAdmin()`.

import type { ActionResult } from "./action";
import { ImageUploadError, MAX_UPLOAD_BYTES, saveUploadedImage, type StoredImage } from "./images";

export const UPLOAD_FIELD = "file";

/** Balas dalam bentuk ActionResult (sama dengan Server Action) supaya client cukup satu pola. */
export function jsonResult<T>(result: ActionResult<T>, status = result.ok ? 200 : 400): Response {
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}

export function uploadError(error: string, status = 400): Response {
  return jsonResult({ ok: false, error }, status);
}

/**
 * Tolak request lintas situs. Server Action punya cek Origin bawaan Next, Route Handler tidak; tanpa
 * ini hanya SameSite=Lax yang mencegah subdomain se-situs mengirim unggahan atas nama admin.
 * Request tanpa header Origin/Sec-Fetch-Site (bukan dari browser, mis. test) dibiarkan.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * Baca field `file` dari multipart, proses dengan sharp, simpan. Mengembalikan foto tersimpan
 * beserta field form lain, atau Response error siap kirim.
 */
export async function receiveImageUpload(
  request: Request,
): Promise<{ image: StoredImage; form: FormData } | Response> {
  if (isCrossSiteRequest(request)) return uploadError("Unggahan dari situs lain ditolak.", 403);
  const length = Number(request.headers.get("content-length") ?? 0);
  // Sedikit kelonggaran untuk overhead multipart.
  if (length > MAX_UPLOAD_BYTES + 512 * 1024) return uploadError("Ukuran foto maksimal 15 MB.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return uploadError("Unggahan tidak lengkap. Coba lagi.");
  }
  const file = form.get(UPLOAD_FIELD);
  if (!(file instanceof Blob)) return uploadError("Pilih foto yang akan diunggah.");

  try {
    return { image: await saveUploadedImage(file), form };
  } catch (error) {
    if (error instanceof ImageUploadError) return uploadError(error.message, 422);
    throw error;
  }
}
