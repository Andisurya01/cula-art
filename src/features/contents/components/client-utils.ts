"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/action";

/**
 * State lokal yang mengikuti prop dari server: diganti saat prop berubah (mis. setelah
 * `router.refresh()`), tapi bisa diubah lokal untuk optimistic update.
 * `syncKey` (default: `value`) menentukan kapan dianggap berubah — pakai nilai primitif
 * jika `value` adalah objek baru di setiap render.
 */
export function useSyncedState<T>(value: T, syncKey: unknown = value) {
  const [state, setState] = useState(value);
  const [previousKey, setPreviousKey] = useState(syncKey);
  // Selama masih ada mutasi berjalan, data server yang datang bisa belum memuat mutasi
  // berikutnya; tunda sinkron supaya optimistic update tidak "balik sendiri".
  const mutating = useIsMutating() > 0;
  if (!mutating && !Object.is(syncKey, previousKey)) {
    setPreviousKey(syncKey);
    setState(value);
  }
  return [state, setState] as const;
}

/** Ubah hasil Server Action gagal menjadi exception, supaya `useMutation.onError` berjalan. */
export async function unwrap<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Terjadi kesalahan";
}
