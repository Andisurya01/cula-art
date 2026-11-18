"use client";

import { STUDIO_CACHE_PREFIX } from "./offline-queue";

/**
 * Hapus cache service worker Studio (halaman offline + ikon). Dipanggil saat logout dan di halaman masuk.
 * Antrean ide di IndexedDB sengaja tidak disentuh (E10).
 */
export async function clearStudioCaches(): Promise<void> {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(STUDIO_CACHE_PREFIX)).map((key) => caches.delete(key)));
    }
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-cache" });
  } catch {
    // Cache bukan data penting; kegagalan tidak boleh menghalangi logout.
  }
}
