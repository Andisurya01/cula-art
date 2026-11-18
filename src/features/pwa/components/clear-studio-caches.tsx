"use client";

import { useEffect } from "react";
import { clearStudioCaches } from "../cache";

/** Dipasang di halaman masuk: setiap jalan keluar dari Studio (logout, sesi habis) menghapus cache Studio. */
export function ClearStudioCaches() {
  useEffect(() => {
    void clearStudioCaches();
  }, []);
  return null;
}
