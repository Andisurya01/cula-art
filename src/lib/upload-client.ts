"use client";
// Unggah satu file ke Route Handler Studio dengan progres (XHR; fetch belum punya progres unggah).
// Response handler berbentuk ActionResult (lihat upload-route.ts).

import type { ActionResult } from "./action";
import { NETWORK_ERROR_MESSAGE } from "./action-client";

export const MAX_UPLOAD_MB = 15;

export function uploadWithProgress<T>(
  url: string,
  file: File,
  options: {
    fields?: Record<string, string>;
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<ActionResult<T>> {
  // Cek ukuran di client dulu supaya file besar tidak sempat terkirim.
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return Promise.resolve({ ok: false, error: `Ukuran foto maksimal ${MAX_UPLOAD_MB} MB.` });
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    for (const [key, value] of Object.entries(options.fields ?? {})) body.append(key, value);
    body.append("file", file);

    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const result = xhr.response as ActionResult<T> | null;
      if (result && typeof result === "object" && "ok" in result) {
        resolve(result);
      } else if (xhr.responseURL.includes("/masuk")) {
        resolve({ ok: false, error: "Sesi berakhir. Muat ulang halaman lalu masuk lagi." });
      } else {
        resolve({ ok: false, error: `Unggahan gagal (HTTP ${xhr.status}). Coba lagi.` });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: NETWORK_ERROR_MESSAGE });
    xhr.onabort = () => resolve({ ok: false, error: "Unggahan dibatalkan." });
    options.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(body);
  });
}
