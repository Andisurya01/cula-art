// Asal zoom lightbox (Fase 7, logika murni tanpa DOM): layar penuh membuka dari foto yang diketuk
// dan menutup kembali ke foto asalnya. Hanya `transform-origin` + skala awal/akhir (A5).

import type { MotionLevel } from "@/lib/theme/schema";

export type LightboxOrigin = {
  /** Pusat foto asal dalam koordinat layar (px), dipakai sebagai `transform-origin` layar penuh. */
  x: number;
  y: number;
  /** Skala awal (buka) dan akhir (tutup) layar penuh. */
  scale: number;
};

type Rect = { left: number; top: number; width: number; height: number };

/** Skala terkecil: foto mini (thumbnail proses) tetap terlihat tumbuh, bukan muncul dari titik. */
export const ORIGIN_MIN_SCALE = 0.12;
/** Halus: hampir tanpa skala (pudar dari arah foto), supaya tidak ada gerak besar. */
export const ORIGIN_SUBTLE_SCALE = 0.92;

/**
 * Asal zoom dari kotak foto di layar. Penuh: layar penuh mengecil selebar foto asal dengan pusat di
 * pusat foto; Halus: skala dekat 1 dari arah foto; Mati (juga "kurangi gerakan") atau kotak tidak
 * valid → `null` (lightbox membuka/menutup langsung tanpa zoom).
 */
export function lightboxOrigin(rect: Rect | null, viewportWidth: number, level: MotionLevel): LightboxOrigin | null {
  if (level === "off" || !rect) return null;
  const valid = [rect.left, rect.top, rect.width, rect.height, viewportWidth].every(Number.isFinite);
  if (!valid || rect.width <= 0 || rect.height <= 0 || viewportWidth <= 0) return null;
  const ratio = Math.min(1, rect.width / viewportWidth);
  const scale = level === "full" ? Math.max(ORIGIN_MIN_SCALE, ratio) : Math.max(ORIGIN_SUBTLE_SCALE, ratio);
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(rect.left + rect.width / 2), y: round(rect.top + rect.height / 2), scale: round(scale) };
}
