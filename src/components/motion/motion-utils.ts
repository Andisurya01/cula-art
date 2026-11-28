// Logika murni primitif animasi (Fase 7 langkah 2): jeda berurutan, hitung naik, waktu CSS.
// Tanpa React/DOM, supaya bisa dites dan dipakai server maupun client.

import type { CSSProperties } from "react";
import type { MotionLevel } from "@/lib/theme/schema";

/** Elemen ke-9 dan seterusnya dalam satu kelompok muncul bersamaan: grid panjang tidak menunggu lama. */
export const STAGGER_CAP = 8;

/** Urutan jeda (0, 1, 2 …) dibatasi `cap`, supaya jeda total tetap pendek. */
export function staggerIndex(index: number, cap: number = STAGGER_CAP): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), Math.max(0, Math.floor(cap)));
}

/**
 * Style `--motion-i` untuk animasi berjeda (CSS mengalikan dengan `--motion-step`, jadi nilainya
 * selalu dari token jeda). Dipakai di komponen server maupun client.
 */
export function motionIndex(index: number, cap: number = STAGGER_CAP): CSSProperties {
  return { "--motion-i": staggerIndex(index, cap) } as CSSProperties;
}

interface Position {
  top: number;
  left: number;
}

/**
 * Urutan muncul untuk elemen yang terlihat bersamaan: baris dulu (atas → bawah), lalu kiri → kanan.
 * Selisih atas < `rowTolerance` px dianggap satu baris (kartu grid yang tingginya sedikit beda).
 * Mengembalikan indeks posisi asli dalam urutan muncul.
 */
export function revealOrder(positions: readonly Position[], rowTolerance = 24): number[] {
  return positions
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => (Math.abs(a.top - b.top) < rowTolerance ? a.left - b.left : a.top - b.top))
    .map((p) => p.i);
}

/**
 * Keputusan awal `Reveal` dari posisi pertama (callback pertama IntersectionObserver), memakai layar
 * ASLI (bukan area pemicu): elemen yang sedikit saja terlihat, ada di atas layar (posisi gulir
 * dipulihkan), atau di luar layar ke samping (kartu baris geser) dibiarkan; hanya elemen yang
 * seluruhnya di bawah layar yang disembunyikan untuk dimunculkan nanti.
 */
export function initialRevealDecision(
  rect: { top: number; bottom: number; left: number; right: number },
  viewport: { width: number; height: number },
): "leave" | "hide" {
  const visible = rect.top < viewport.height && rect.bottom > 0;
  const above = rect.bottom <= 0;
  const sideways = rect.left >= viewport.width || rect.right <= 0;
  return visible || above || sideways ? "leave" : "hide";
}

/** Durasi CSS (`"450ms"`, `"0.45s"`, `" 250ms "`) → milidetik. Tidak valid → 0. */
export function parseCssTime(value: string | null | undefined): number {
  const match = /^\s*(-?\d*\.?\d+)(ms|s)\s*$/.exec(value ?? "");
  if (!match) return 0;
  const n = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Lama hitung naik: Penuh = 2× durasi lambat, Halus = durasi lambat, Mati = 0. Maks. 2 detik supaya
 * angka tidak lama "salah". `slowMs` dibaca dari `--motion-slow` (0 saat gerak dikurangi).
 */
export function countUpDuration(level: MotionLevel, slowMs: number): number {
  if (level === "off" || !(slowMs > 0)) return 0;
  return Math.min(2000, level === "full" ? slowMs * 2 : slowMs);
}

/** Kurva melambat di akhir (angka "mendarat"). */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** Nilai pada kemajuan `progress` (0-1), dibulatkan ke `decimals`. Kemajuan ≥ 1 → tepat target. */
export function countUpValue(target: number, progress: number, decimals = 0): number {
  if (progress >= 1 || !Number.isFinite(target)) return target;
  const factor = 10 ** decimals;
  return Math.round(target * easeOutCubic(progress) * factor) / factor;
}

/**
 * Angka gaya Indonesia tanpa `Intl` (hasil sama persis di Node dan browser, aman untuk hidrasi):
 * ribuan dengan titik, desimal dengan koma. `formatCount(12345)` → "12.345", `formatCount(12.5, 1)` → "12,5".
 */
export function formatCount(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const places = Math.max(0, Math.min(4, Math.floor(decimals)));
  const fixed = Math.abs(value).toFixed(places);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 && Number(fixed) !== 0 ? "-" : "";
  return `${sign}${grouped}${fraction ? `,${fraction}` : ""}`;
}
