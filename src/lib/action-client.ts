"use client";

import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "./action";

export const NETWORK_ERROR_MESSAGE = "Gagal terhubung ke server. Periksa koneksi lalu coba lagi.";

/**
 * Panggil Server Action dari client tanpa membuat halaman crash jika request gagal
 * (sinyal putus, server restart). Error tak terduga diubah menjadi ActionResult gagal,
 * sehingga input form tetap ada dan pesan tampil lewat toast.
 */
export async function callAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
}
