// Aturan karya (fungsi murni, aman di client): syarat terbit, cover, slug, dan hapus.
// Server memakai fungsi yang sama untuk menegakkan aturan; UI memakainya untuk menampilkan daftar syarat.

import type { Availability, Medium } from "@prisma/client";
import { isValidSlug, slugify, SLUG_MAX_LENGTH } from "@/lib/slug";

// ---- Syarat terbit ----

export type PublishImage = { id: string; alt: string; isProcess: boolean };

export type PublishState = {
  title: string;
  medium: Medium | null;
  year: number | null;
  images: PublishImage[];
};

export type PublishRequirement = "title" | "medium" | "year" | "finishedPhoto" | "alt";

export type PublishProblem = { key: PublishRequirement; message: string };

export const PUBLISH_REQUIREMENT_LABELS: Record<PublishRequirement, string> = {
  title: "Judul diisi",
  medium: "Medium dipilih",
  year: "Tahun selesai diisi",
  finishedPhoto: "Minimal 1 foto karya jadi (bukan foto proses)",
  alt: "Setiap foto punya teks alternatif",
};

/** Id foto yang teks alternatifnya masih kosong. */
export function imagesMissingAlt(images: PublishImage[]): string[] {
  return images.filter((img) => img.alt.trim() === "").map((img) => img.id);
}

/**
 * Syarat yang belum terpenuhi untuk terbit (kosong = boleh terbit): judul, medium, tahun,
 * minimal 1 foto karya jadi, dan setiap foto (termasuk foto proses) punya teks alternatif.
 */
export function publishProblems(state: PublishState): PublishProblem[] {
  const problems: PublishProblem[] = [];
  if (state.title.trim() === "") problems.push({ key: "title", message: "Judul belum diisi." });
  if (!state.medium) problems.push({ key: "medium", message: "Medium belum dipilih." });
  if (state.year === null) problems.push({ key: "year", message: "Tahun selesai belum diisi." });
  if (!state.images.some((img) => !img.isProcess)) {
    problems.push({ key: "finishedPhoto", message: "Belum ada foto karya jadi (foto proses tidak dihitung)." });
  }
  const missingAlt = imagesMissingAlt(state.images).length;
  if (missingAlt > 0) {
    problems.push({ key: "alt", message: `${missingAlt} foto belum punya teks alternatif.` });
  }
  return problems;
}

/**
 * Masalah terbit yang BARU muncul akibat perubahan (before → after). Dipakai untuk menolak perubahan
 * pada karya yang sedang Terbit (mis. mengosongkan medium, menghapus foto karya jadi terakhir,
 * mengosongkan teks alternatif), supaya karya Terbit selalu memenuhi syarat.
 * Foto yang baru ditambahkan (belum ada di `before`) tidak dihitung.
 */
export function introducedProblems(before: PublishState, after: PublishState): string[] {
  const beforeKeys = new Set(publishProblems(before).map((p) => p.key));
  const messages = publishProblems(after)
    .filter((p) => p.key !== "alt" && !beforeKeys.has(p.key))
    .map((p) => p.message);

  const existing = new Set(before.images.map((img) => img.id));
  const missingBefore = new Set(imagesMissingAlt(before.images));
  const newlyMissing = imagesMissingAlt(after.images).filter((id) => existing.has(id) && !missingBefore.has(id));
  if (newlyMissing.length > 0) messages.push("Teks alternatif foto tidak boleh kosong.");
  return messages;
}

// ---- Cover ----

export type CoverCandidate = { id: string; isCover: boolean; isProcess: boolean; order: number };

/**
 * Foto yang seharusnya menjadi cover: cover yang ada (jika foto karya jadi), selain itu foto karya jadi
 * pertama menurut urutan. Foto proses tidak pernah menjadi cover. Null jika belum ada foto karya jadi.
 */
export function resolveCoverId(images: CoverCandidate[]): string | null {
  const finished = images.filter((img) => !img.isProcess).sort((a, b) => a.order - b.order);
  return (finished.find((img) => img.isCover) ?? finished[0])?.id ?? null;
}

/**
 * Urutan baru setelah `coverId` dijadikan cover: foto itu pindah ke posisi pertama di antara foto
 * karya jadi (Galeri juga menampilkan cover lebih dulu), foto lain tetap berurutan.
 */
export function orderWithCoverFirst(images: CoverCandidate[], coverId: string): string[] {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const finished = sorted.filter((img) => !img.isProcess && img.id !== coverId).map((img) => img.id);
  const process = sorted.filter((img) => img.isProcess).map((img) => img.id);
  return [coverId, ...finished, ...process];
}

/** True jika `ids` berisi tepat semua id foto (tanpa duplikat, tanpa tambahan). */
export function isSameIdSet(ids: string[], expected: string[]): boolean {
  if (ids.length !== expected.length) return false;
  const set = new Set(ids);
  return set.size === ids.length && expected.every((id) => set.has(id));
}

// ---- Slug ----

/**
 * True jika `slug` adalah slug otomatis untuk `title` (`slugify(title)` atau dengan akhiran `-2`, `-3`, …),
 * artinya belum pernah diubah manual. Dipakai form untuk memutuskan slug ikut judul atau tidak.
 */
export function isAutoSlug(slug: string, title: string): boolean {
  const base = slugify(title);
  if (slug === base) return true;
  const match = /^(.+)-(\d+)$/.exec(slug);
  if (!match || Number(match[2]) < 2) return false;
  const root = match[1];
  if (root === base) return true;
  // uniqueSlug memotong akar panjang supaya akhiran muat dalam SLUG_MAX_LENGTH.
  return base.length > SLUG_MAX_LENGTH - match[2].length - 1 && base.startsWith(root);
}

export type SlugOwners = {
  /** Id karya yang memakai slug ini sebagai Artwork.slug. */
  slugOwner: string | null;
  /** Id karya yang dituju redirect dengan oldSlug ini. */
  redirectOwner: string | null;
};

export type SlugChangePlan =
  | { kind: "unchanged" }
  | { kind: "invalid"; message: string }
  | {
      kind: "change";
      slug: string;
      /** Slug lama yang dicatat sebagai redirect ke karya ini. */
      addRedirect: string;
      /** Redirect lama milik karya ini yang dihapus karena slug-nya dipakai lagi. */
      removeRedirect: string | null;
    };

export const SLUG_ERRORS = {
  format: "Slug hanya boleh huruf kecil, angka, dan tanda hubung (maks. 80 karakter).",
  takenByArtwork: "Slug ini sudah dipakai karya lain. Pilih slug lain.",
  takenByRedirect:
    "Slug ini pernah dipakai karya lain dan tautan lamanya masih diarahkan ke sana. Pilih slug lain.",
} as const;

/** Rencana penggantian slug karya `artworkId` dari `current` ke `next`. */
export function planSlugChange(input: {
  artworkId: string;
  current: string;
  next: string;
  owners: SlugOwners;
}): SlugChangePlan {
  const { artworkId, current, next, owners } = input;
  if (next === current) return { kind: "unchanged" };
  if (!isValidSlug(next)) return { kind: "invalid", message: SLUG_ERRORS.format };
  if (owners.slugOwner && owners.slugOwner !== artworkId) {
    return { kind: "invalid", message: SLUG_ERRORS.takenByArtwork };
  }
  if (owners.redirectOwner && owners.redirectOwner !== artworkId) {
    return { kind: "invalid", message: SLUG_ERRORS.takenByRedirect };
  }
  return {
    kind: "change",
    slug: next,
    addRedirect: current,
    removeRedirect: owners.redirectOwner === artworkId ? next : null,
  };
}

/** True jika slug dipakai pihak lain (bukan `selfId`), baik sebagai slug karya maupun redirect. */
export function isSlugTakenByOther(owners: SlugOwners, selfId?: string): boolean {
  return (
    (owners.slugOwner !== null && owners.slugOwner !== selfId) ||
    (owners.redirectOwner !== null && owners.redirectOwner !== selfId)
  );
}

// ---- Hapus ----

/** Karya terjual tidak dihapus (nanti dirujuk pesanan), hanya diarsipkan. */
export function deleteBlockedReason(availability: Availability): string | null {
  return availability === "SOLD" ? "Karya yang sudah terjual tidak bisa dihapus. Arsipkan saja." : null;
}
