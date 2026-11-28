// Pembantu View Transitions (Fase 7, A7/A8) di atas `<ViewTransition>` React 19.3 + Next 16.
// Panduan: node_modules/next/dist/docs/01-app/02-guides/view-transitions.md.
// Kelas transisi di bawah dipetakan ke durasi/easing token di `globals.css` (`::view-transition-*`),
// dan mati saat `data-motion="off"` atau "kurangi gerakan". Tanpa dukungan browser, navigasi tetap
// normal tanpa animasi. Aman dipakai di Server Component.

import { ViewTransition } from "react";

/** `view-transition-class` yang dikenal CSS. Jangan menulis nama kelas transisi lain di komponen. */
export const VT_CLASS = {
  /** Elemen bersama yang "melebar" (foto kartu katalog → foto utama detail). */
  morph: "vt-morph",
  /** Galeri: halaman lama memudar cepat, halaman baru masuk lembut (sedikit naik di tingkat Penuh). */
  page: "vt-page",
  /** Crossfade singkat tanpa geser (antarmenu Studio, hasil filter katalog). */
  fade: "vt-fade",
  /** Penanda menu aktif Studio yang berpindah ke menu baru. */
  pill: "vt-pill",
} as const;

/**
 * Nama `view-transition-name` yang aman (huruf kecil, angka, `-`), diawali `prefix` supaya tidak
 * pernah diawali angka. Nama harus unik di satu halaman.
 */
export function transitionName(prefix: string, id: string): string {
  const safe = `${prefix}-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return /^[a-z]/.test(safe) ? safe : `vt-${safe}`;
}

/** Nama foto karya yang sama di kartu katalog/beranda dan di foto utama detail (A8). */
export const artworkPhotoTransitionName = (slug: string) => transitionName("karya-foto", slug);

/**
 * Elemen bersama antarhalaman: pasang dengan `name` yang sama di halaman asal dan tujuan.
 * `default="none"` supaya elemen ini tidak ikut crossfade pada transisi lain (panduan Next).
 */
export function SharedElement({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={name} share={VT_CLASS.morph} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Transisi masuk/keluar halaman. Dipasang di `template.tsx` per sisi (dipasang ulang setiap navigasi),
 * bukan di layout (layout tetap, jadi enter/exit tidak pernah jalan di sana).
 */
export function PageTransition({
  variant = "page",
  children,
}: {
  variant?: "page" | "fade";
  children: React.ReactNode;
}) {
  const className = VT_CLASS[variant];
  return (
    <ViewTransition enter={className} exit={className} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Crossfade isi di route yang sama (mis. hasil katalog saat filter berubah). `swapKey` berubah →
 * React memperlakukan isi lama/baru sebagai pasangan keluar/masuk dan memudarkan keduanya.
 */
export function SwapTransition({
  swapKey,
  name,
  children,
}: {
  swapKey: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      key={swapKey}
      name={name}
      share={VT_CLASS.fade}
      enter={VT_CLASS.fade}
      exit={VT_CLASS.fade}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
