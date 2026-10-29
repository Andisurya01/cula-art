import { describe, expect, it } from "vitest";
import {
  artworkPhotoIds,
  chronologicalPhotos,
  isUploadedPhoto,
  photoImage,
  photoSrc,
  projectPhotoUploadUrl,
} from "./photo";

const KEY = "0123456789abcdef0123456789abcdef.webp";

describe("photoSrc / photoImage", () => {
  it("unggahan memakai /media/<key> dan ukuran asli", () => {
    const photo = { url: null, storageKey: KEY, width: 1200, height: 900 };
    expect(photoSrc(photo)).toBe(`/media/${KEY}`);
    expect(photoImage(photo)).toEqual({
      kind: "upload",
      src: `/media/${KEY}`,
      size: { width: 1200, height: 900 },
    });
  });

  it("unggahan tanpa ukuran tercatat → size null (next/image fill)", () => {
    expect(photoImage({ url: null, storageKey: KEY, width: null, height: 900 })).toEqual({
      kind: "upload",
      src: `/media/${KEY}`,
      size: null,
    });
    expect(photoImage({ url: null, storageKey: KEY, width: 0, height: 0 }).kind).toBe("upload");
  });

  it("storageKey menang atas URL lama; URL lama tetap <img> eksternal", () => {
    expect(photoSrc({ url: "https://contoh.id/a.jpg", storageKey: KEY })).toBe(`/media/${KEY}`);
    expect(photoImage({ url: "https://contoh.id/a.jpg", storageKey: null })).toEqual({
      kind: "external",
      src: "https://contoh.id/a.jpg",
    });
  });

  it("isUploadedPhoto hanya untuk foto ber-storageKey", () => {
    expect(isUploadedPhoto({ url: null, storageKey: KEY })).toBe(true);
    expect(isUploadedPhoto({ url: "https://contoh.id/a.jpg", storageKey: null })).toBe(false);
  });
});

describe("projectPhotoUploadUrl", () => {
  it("berada di bawah halaman detail proyek dan meng-encode id", () => {
    expect(projectPhotoUploadUrl("abc123")).toBe("/studio/proyek/abc123/foto");
    expect(projectPhotoUploadUrl("a/b")).toBe("/studio/proyek/a%2Fb/foto");
  });
});

describe("urutan dan pilihan foto untuk Jadikan Karya", () => {
  const d = (iso: string) => new Date(iso);
  const photos = [
    // urutan tampilan: terbaru dulu
    { id: "c", url: null, storageKey: KEY, takenAt: d("2026-10-20T00:00:00Z"), createdAt: d("2026-10-21T00:00:00Z") },
    { id: "url", url: "https://contoh.id/a.jpg", storageKey: null, takenAt: d("2026-10-15T00:00:00Z"), createdAt: d("2026-10-15T00:00:00Z") },
    { id: "b", url: null, storageKey: KEY, takenAt: null, createdAt: d("2026-10-10T00:00:00Z") },
    { id: "a", url: null, storageKey: KEY, takenAt: d("2026-10-01T00:00:00Z"), createdAt: d("2026-10-25T00:00:00Z") },
  ];

  it("kronologis memakai tanggal foto, atau waktu dibuat jika tanggal kosong", () => {
    expect(chronologicalPhotos(photos).map((p) => p.id)).toEqual(["a", "b", "url", "c"]);
  });

  it("tanggal sama → yang dibuat lebih dulu di depan", () => {
    const same = d("2026-10-01T00:00:00Z");
    const list = [
      { id: "y", takenAt: same, createdAt: d("2026-10-02T00:00:00Z") },
      { id: "x", takenAt: same, createdAt: d("2026-10-01T00:00:00Z") },
    ];
    expect(chronologicalPhotos(list).map((p) => p.id)).toEqual(["x", "y"]);
  });

  it("hanya foto unggahan yang dipilih, urut kronologis; foto URL diabaikan", () => {
    expect(artworkPhotoIds(photos, new Set(["c", "url", "a"]))).toEqual(["a", "c"]);
    expect(artworkPhotoIds(photos, new Set())).toEqual([]);
  });

  it("tidak mengubah array asal", () => {
    const before = photos.map((p) => p.id);
    chronologicalPhotos(photos);
    expect(photos.map((p) => p.id)).toEqual(before);
  });
});
