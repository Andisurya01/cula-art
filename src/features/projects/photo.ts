// Fungsi murni foto progres (aman di client dan server).

import { routes } from "@/lib/routes";

/** Foto progres: file unggahan (`storageKey`) atau URL lama (Fase 1). DB menjamin salah satunya ada. */
export type PhotoSource = { url: string | null; storageKey: string | null };
export type SizedPhotoSource = PhotoSource & { width?: number | null; height?: number | null };

/** Sumber gambar foto progres: file unggahan (/media/<key>) atau URL lama. */
export function photoSrc(photo: PhotoSource): string {
  if (photo.storageKey) return routes.media(photo.storageKey);
  return photo.url ?? "";
}

export function isUploadedPhoto<T extends PhotoSource>(photo: T): photo is T & { storageKey: string } {
  return !!photo.storageKey;
}

/**
 * Cara menampilkan foto: unggahan lewat `next/image` (pakai ukuran asli jika tercatat, selain itu
 * `fill`), URL eksternal lewat `<img>` biasa (CSP Studio mengizinkan https:).
 */
export type PhotoImage =
  | { kind: "upload"; src: string; size: { width: number; height: number } | null }
  | { kind: "external"; src: string };

export function photoImage(photo: SizedPhotoSource): PhotoImage {
  if (photo.storageKey) {
    const { width, height } = photo;
    const size = width && height && width > 0 && height > 0 ? { width, height } : null;
    return { kind: "upload", src: routes.media(photo.storageKey), size };
  }
  return { kind: "external", src: photo.url ?? "" };
}

/** Endpoint unggah foto progres (Route Handler `src/app/studio/(app)/proyek/[id]/foto/route.ts`). */
export function projectPhotoUploadUrl(projectId: string): string {
  return routes.studio.projectPhotoUpload(projectId);
}

type DatedPhoto = { id: string; takenAt: Date | null; createdAt: Date };

/** Urut kronologis (tanggal foto, atau waktu dibuat jika tanggal kosong), terlama dulu. */
export function chronologicalPhotos<T extends DatedPhoto>(photos: T[]): T[] {
  const time = (p: DatedPhoto) => (p.takenAt ?? p.createdAt).getTime();
  return [...photos].sort(
    (a, b) => time(a) - time(b) || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/**
 * Id foto untuk `createArtworkFromProject`: hanya foto unggahan yang dipilih, urut kronologis
 * (proses diceritakan dari awal). Foto URL tidak bisa disalin ke karya.
 */
export function artworkPhotoIds<T extends DatedPhoto & PhotoSource>(
  photos: T[],
  selected: ReadonlySet<string>,
): string[] {
  return chronologicalPhotos(photos.filter((p) => isUploadedPhoto(p) && selected.has(p.id))).map(
    (p) => p.id,
  );
}
