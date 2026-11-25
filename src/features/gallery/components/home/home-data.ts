// Turunan tampilan Beranda Galeri (fungsi murni, tanpa query): teks hero, tahun berkarya, dan
// nomor bagian "(01)" yang tetap urut walau bagian kosong disembunyikan.

import { galleryCopy } from "../../copy";
import type { GalleryProfile, GalleryStats } from "../../dto";

/**
 * Tagline sepanjang ini (karakter) masih pantas sebagai baris kedua judul display (±3 baris di kolom
 * hero desktop); yang lebih panjang membuat judul terlalu tinggi.
 */
export const HERO_TAGLINE_MAX = 32;

/**
 * Judul hero: baris pertama nama situs, baris kedua tagline pendek (atau teks bawaan). Tagline yang
 * terlalu panjang untuk judul display tampil sebagai paragraf pengantar (`lead`).
 */
export function heroHeading(tagline: string | null): { second: string; lead: string | null } {
  if (tagline && tagline.length <= HERO_TAGLINE_MAX) return { second: tagline, lead: null };
  return { second: galleryCopy.home.heroSecond, lead: tagline };
}

/** Jumlah tahun berkarya dari rentang tahun karya Terbit (2024-2026 = 3); null jika tidak ada tahun. */
export function yearsActive(stats: Pick<GalleryStats, "firstYear" | "lastYear">): number | null {
  const { firstYear, lastYear } = stats;
  if (firstYear === null || lastYear === null || lastYear < firstYear) return null;
  return lastYear - firstYear + 1;
}

/** Bagian profil singkat Beranda tampil jika ada foto, bio, atau tautan sosial. */
export function hasProfileSummary(
  profile: Pick<GalleryProfile, "avatarSrc" | "bio" | "instagramUrl" | "tiktokUrl">,
): boolean {
  return Boolean(profile.avatarSrc || profile.bio || profile.instagramUrl || profile.tiktokUrl);
}

/** Nomor bagian 1..n hanya untuk bagian yang tampil, sesuai urutan kunci; bagian tersembunyi → undefined. */
export function numberSections<K extends string>(visible: Record<K, boolean>): Partial<Record<K, number>> {
  const numbers: Partial<Record<K, number>> = {};
  let n = 0;
  for (const key of Object.keys(visible) as K[]) if (visible[key]) numbers[key] = ++n;
  return numbers;
}
