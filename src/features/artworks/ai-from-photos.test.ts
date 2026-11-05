import { describe, expect, it } from "vitest";
import { artworkPhotosInput } from "@/features/ai/prompts/artwork-photos";
import {
  aiPhotoOrder,
  aiPhotosBlockedReason,
  AI_NOTES_MAX,
  appliedMessage,
  usableAiParts,
  defaultAiPhotoIds,
  MAX_ARTWORK_AI_PHOTOS,
  resolveAiPhotoSelection,
  toArtworkPhotosInput,
  toggleAiPhoto,
  type ArtworkAiFormValues,
} from "./ai-from-photos";

type Photo = { id: string; order: number; isCover: boolean; isProcess: boolean };
const photo = (id: string, order: number, extra: Partial<Photo> = {}): Photo => ({
  id,
  order,
  isCover: false,
  isProcess: false,
  ...extra,
});

// Urutan tersimpan: proses p1 di tengah foto karya jadi; cover = c (bukan foto pertama).
const photos: Photo[] = [
  photo("a", 0),
  photo("p1", 1, { isProcess: true }),
  photo("b", 2),
  photo("c", 3, { isCover: true }),
  photo("d", 4),
  photo("e", 5),
  photo("p2", 6, { isProcess: true }),
];

describe("aiPhotoOrder", () => {
  it("cover dulu, lalu foto karya jadi menurut urutan, lalu foto proses", () => {
    expect(aiPhotoOrder(photos).map((p) => p.id)).toEqual(["c", "a", "b", "d", "e", "p1", "p2"]);
  });

  it("tanpa cover tersimpan → foto karya jadi pertama dianggap cover", () => {
    const list = [photo("x", 2), photo("p", 0, { isProcess: true }), photo("y", 1)];
    expect(aiPhotoOrder(list).map((p) => p.id)).toEqual(["y", "x", "p"]);
  });

  it("tidak mengubah array asal", () => {
    const copy = [...photos];
    aiPhotoOrder(photos);
    expect(photos).toEqual(copy);
  });
});

describe("defaultAiPhotoIds", () => {
  it("cover + 3 foto berikutnya, foto karya jadi didahulukan", () => {
    expect(defaultAiPhotoIds(photos)).toEqual(["c", "a", "b", "d"]);
    expect(MAX_ARTWORK_AI_PHOTOS).toBe(4);
  });

  it("foto karya jadi kurang dari 4 → dilengkapi foto proses", () => {
    const list = [photo("a", 0), photo("p1", 1, { isProcess: true }), photo("p2", 2, { isProcess: true }), photo("p3", 3, { isProcess: true }), photo("p4", 4, { isProcess: true })];
    expect(defaultAiPhotoIds(list)).toEqual(["a", "p1", "p2", "p3"]);
  });

  it("hanya foto proses → foto proses menurut urutan", () => {
    const list = [photo("p2", 1, { isProcess: true }), photo("p1", 0, { isProcess: true })];
    expect(defaultAiPhotoIds(list)).toEqual(["p1", "p2"]);
  });

  it("belum ada foto → kosong", () => {
    expect(defaultAiPhotoIds([])).toEqual([]);
  });
});

describe("resolveAiPhotoSelection", () => {
  it("null (belum diubah pengguna) → pilihan awal", () => {
    expect(resolveAiPhotoSelection(photos, null)).toEqual(["c", "a", "b", "d"]);
  });

  it("pilihan pengguna diurutkan seperti pemilih, foto yang sudah dihapus dibuang", () => {
    expect(resolveAiPhotoSelection(photos, ["p2", "hilang", "e", "c"])).toEqual(["c", "e", "p2"]);
  });

  it("maksimal 4 foto", () => {
    expect(resolveAiPhotoSelection(photos, ["a", "b", "c", "d", "e"])).toEqual(["c", "a", "b", "d"]);
  });

  it("pilihan kosong tetap kosong (bukan kembali ke pilihan awal)", () => {
    expect(resolveAiPhotoSelection(photos, [])).toEqual([]);
  });
});

describe("toggleAiPhoto", () => {
  it("menambah dan menghapus centang", () => {
    expect(toggleAiPhoto(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleAiPhoto(["a", "b"], "a")).toEqual(["b"]);
  });

  it("tidak menambah foto ke-5", () => {
    expect(toggleAiPhoto(["a", "b", "c", "d"], "e")).toEqual(["a", "b", "c", "d"]);
  });

  it("masih bisa menghapus centang saat penuh", () => {
    expect(toggleAiPhoto(["a", "b", "c", "d"], "c")).toEqual(["a", "b", "d"]);
  });
});

describe("aiPhotosBlockedReason", () => {
  it("belum ada foto → minta unggah", () => {
    expect(aiPhotosBlockedReason(0, 0)).toBe("Unggah foto karya dulu.");
  });
  it("ada foto tapi tidak ada yang dipilih", () => {
    expect(aiPhotosBlockedReason(3, 0)).toBe("Pilih minimal 1 foto.");
  });
  it("ada foto terpilih → boleh", () => {
    expect(aiPhotosBlockedReason(3, 2)).toBeNull();
  });
});

describe("usableAiParts", () => {
  it("hanya bagian yang ada isinya", () => {
    expect(usableAiParts({ summary: "Satu kalimat.", description: "Cerita", alts: [{}] })).toEqual([
      "summary",
      "description",
      "alts",
    ]);
    expect(usableAiParts({ summary: "  ", description: "", alts: [] })).toEqual([]);
    expect(usableAiParts({ description: "Cerita" })).toEqual(["description"]);
  });
});

describe("appliedMessage", () => {
  it("ringkasan atau cerita saja", () => {
    expect(appliedMessage(["summary"], 0)).toBe(
      "Ringkasan masuk ke form. Belum tersimpan sampai kamu menekan Simpan perubahan.",
    );
    expect(appliedMessage(["description"], 0)).toBe(
      "Cerita masuk ke form. Belum tersimpan sampai kamu menekan Simpan perubahan.",
    );
  });

  it("teks alternatif saja", () => {
    expect(appliedMessage(["alts"], 3)).toBe(
      "Teks alternatif masuk sebagai draf di 3 foto. Periksa lalu tekan Simpan di setiap foto.",
    );
    expect(appliedMessage(["alts"], 0)).toBe("Teks alternatif dari AI sama dengan yang sudah tersimpan.");
  });

  it("semua bagian", () => {
    expect(appliedMessage(["summary", "description", "alts"], 2)).toBe(
      "Ringkasan dan cerita masuk ke form. Teks alternatif masuk sebagai draf di 2 foto. Belum tersimpan: tekan Simpan perubahan dan Simpan di setiap foto.",
    );
    expect(appliedMessage(["summary", "description", "alts"], 0)).toBe(
      "Ringkasan dan cerita masuk ke form. Belum tersimpan sampai kamu menekan Simpan perubahan. Teks alternatif dari AI sama dengan yang sudah tersimpan.",
    );
  });
});

const values: ArtworkAiFormValues = {
  title: "  Kepala Naga ",
  medium: "CLAY",
  year: "2026",
  materials: "Clay air dry, cat akrilik",
  widthCm: "12,5",
  heightCm: "20",
  depthCm: "",
  summary: "",
  description: "Paragraf satu.\n\nParagraf dua.  ",
};

describe("toArtworkPhotosInput", () => {
  it("nilai form mentah → input AI (string kosong → null, angka dari teks)", () => {
    expect(toArtworkPhotosInput({ artworkId: "art1", imageIds: ["c", "a"], notes: "  ", values })).toEqual({
      artworkId: "art1",
      imageIds: ["c", "a"],
      notes: null,
      title: "Kepala Naga",
      medium: "CLAY",
      year: 2026,
      materials: "Clay air dry, cat akrilik",
      widthCm: 12.5,
      heightCm: 20,
      depthCm: null,
      summary: null,
      description: "Paragraf satu.\n\nParagraf dua.",
    });
  });

  it("nilai yang sudah berupa angka/null (setelah reset form) diterima", () => {
    const input = toArtworkPhotosInput({
      artworkId: "art1",
      imageIds: ["a"],
      notes: "Untuk pameran sekolah",
      values: { ...values, year: 2025, widthCm: 30, heightCm: null, depthCm: undefined, medium: null, summary: null },
    });
    expect(input).toMatchObject({ notes: "Untuk pameran sekolah", year: 2025, widthCm: 30, heightCm: null, depthCm: null, medium: null, summary: null });
  });

  it("angka yang belum valid dikirim null supaya permintaan tidak ditolak", () => {
    const input = toArtworkPhotosInput({
      artworkId: "art1",
      imageIds: ["a"],
      notes: "",
      values: { ...values, year: "20", widthCm: "abc", heightCm: "-3", depthCm: "0" },
    });
    expect(input).toMatchObject({ year: null, widthCm: null, heightCm: null, depthCm: null });
    expect(toArtworkPhotosInput({ artworkId: "a", imageIds: ["a"], notes: "", values: { ...values, year: "2026,5" } }).year).toBeNull();
    expect(toArtworkPhotosInput({ artworkId: "a", imageIds: ["a"], notes: "", values: { ...values, year: "1800" } }).year).toBeNull();
  });

  it("teks terlalu panjang dipotong dan foto maks. 4, jadi tetap lolos schema input AI", () => {
    const input = toArtworkPhotosInput({
      artworkId: "art1",
      imageIds: ["a", "b", "c", "d", "e"],
      notes: "n".repeat(AI_NOTES_MAX + 50),
      values: {
        ...values,
        title: "t".repeat(250),
        materials: "m".repeat(400),
        summary: "s".repeat(400),
        description: "d".repeat(12_000),
      },
    });
    expect(input.imageIds).toEqual(["a", "b", "c", "d"]);
    expect(input.notes).toHaveLength(AI_NOTES_MAX);
    expect(input.summary).toHaveLength(300);
    expect(artworkPhotosInput.safeParse(input).success).toBe(true);
  });

  it("hasil konversi lolos schema input AI", () => {
    const input = toArtworkPhotosInput({ artworkId: "art1", imageIds: ["c"], notes: "Catatan", values });
    expect(artworkPhotosInput.safeParse(input).success).toBe(true);
  });
});
