import { describe, expect, it } from "vitest";
import {
  deleteBlockedReason,
  imagesMissingAlt,
  introducedProblems,
  isAutoSlug,
  isSameIdSet,
  isSlugTakenByOther,
  orderWithCoverFirst,
  planSlugChange,
  publishProblems,
  resolveCoverId,
  SLUG_ERRORS,
  type PublishState,
} from "./rules";

const ready: PublishState = {
  title: "Kepala Naga",
  medium: "CLAY",
  year: 2026,
  images: [
    { id: "a", alt: "Patung naga dari depan", isProcess: false },
    { id: "p", alt: "Armature kawat", isProcess: true },
  ],
};

const keys = (state: PublishState) => publishProblems(state).map((p) => p.key);

describe("publishProblems (syarat terbit)", () => {
  it("lengkap → boleh terbit", () => {
    expect(publishProblems(ready)).toEqual([]);
  });

  it("karya kosong → semua syarat kecuali alt (belum ada foto)", () => {
    expect(keys({ title: "  ", medium: null, year: null, images: [] })).toEqual([
      "title",
      "medium",
      "year",
      "finishedPhoto",
    ]);
  });

  it("hanya foto proses tidak cukup", () => {
    expect(keys({ ...ready, images: [{ id: "p", alt: "Proses", isProcess: true }] })).toEqual(["finishedPhoto"]);
  });

  it("setiap foto (termasuk foto proses) wajib punya teks alternatif; spasi saja dianggap kosong", () => {
    const state = {
      ...ready,
      images: [
        { id: "a", alt: "Ada", isProcess: false },
        { id: "b", alt: "   ", isProcess: false },
        { id: "p", alt: "", isProcess: true },
      ],
    };
    expect(imagesMissingAlt(state.images)).toEqual(["b", "p"]);
    const problems = publishProblems(state);
    expect(problems.map((p) => p.key)).toEqual(["alt"]);
    expect(problems[0].message).toContain("2 foto");
  });
});

describe("introducedProblems (menjaga karya yang sedang Terbit)", () => {
  it("tidak ada perubahan atau perubahan aman → kosong", () => {
    expect(introducedProblems(ready, ready)).toEqual([]);
    expect(introducedProblems(ready, { ...ready, year: 2025 })).toEqual([]);
  });

  it("mengosongkan medium/tahun atau menghapus foto karya jadi terakhir ditolak", () => {
    expect(introducedProblems(ready, { ...ready, medium: null })).toHaveLength(1);
    expect(introducedProblems(ready, { ...ready, year: null })).toHaveLength(1);
    expect(introducedProblems(ready, { ...ready, images: ready.images.filter((i) => i.id !== "a") })).toHaveLength(1);
  });

  it("mengosongkan teks alternatif foto lama ditolak, walau foto lain sudah kosong", () => {
    const before = { ...ready, images: [...ready.images, { id: "x", alt: "", isProcess: false }] };
    const after = { ...before, images: before.images.map((i) => (i.id === "a" ? { ...i, alt: "" } : i)) };
    expect(introducedProblems(before, after)).toEqual(["Teks alternatif foto tidak boleh kosong."]);
  });

  it("foto baru tanpa alt (baru diunggah) tidak dihitung, masalah lama tidak diulang", () => {
    const after = { ...ready, images: [...ready.images, { id: "new", alt: "", isProcess: false }] };
    expect(introducedProblems(ready, after)).toEqual([]);
    const broken = { ...ready, medium: null };
    expect(introducedProblems(broken, broken)).toEqual([]);
  });
});

describe("cover", () => {
  const img = (id: string, order: number, extra: { isCover?: boolean; isProcess?: boolean } = {}) => ({
    id,
    order,
    isCover: extra.isCover ?? false,
    isProcess: extra.isProcess ?? false,
  });

  it("cover yang ada dipertahankan", () => {
    expect(resolveCoverId([img("a", 0), img("b", 1, { isCover: true })])).toBe("b");
  });

  it("tanpa cover → foto karya jadi pertama menurut urutan", () => {
    expect(resolveCoverId([img("b", 2), img("a", 1), img("p", 0, { isProcess: true })])).toBe("a");
  });

  it("foto proses tidak pernah cover; tanpa foto karya jadi → null", () => {
    expect(resolveCoverId([img("p", 0, { isProcess: true, isCover: true }), img("a", 1)])).toBe("a");
    expect(resolveCoverId([img("p", 0, { isProcess: true, isCover: true })])).toBeNull();
    expect(resolveCoverId([])).toBeNull();
  });

  it("orderWithCoverFirst: cover pindah ke depan, foto proses tetap di belakang", () => {
    const images = [img("a", 0), img("p", 1, { isProcess: true }), img("b", 2), img("c", 3)];
    expect(orderWithCoverFirst(images, "c")).toEqual(["c", "a", "b", "p"]);
  });

  it("isSameIdSet menolak id kurang, lebih, atau ganda", () => {
    expect(isSameIdSet(["b", "a"], ["a", "b"])).toBe(true);
    expect(isSameIdSet(["a"], ["a", "b"])).toBe(false);
    expect(isSameIdSet(["a", "a"], ["a", "b"])).toBe(false);
    expect(isSameIdSet(["a", "c"], ["a", "b"])).toBe(false);
    expect(isSameIdSet([], [])).toBe(true);
  });
});

describe("slug", () => {
  it("isAutoSlug: slug dari judul (dengan akhiran -2, -3) vs slug manual", () => {
    expect(isAutoSlug("kepala-naga", "Kepala Naga")).toBe(true);
    expect(isAutoSlug("kepala-naga-3", "Kepala Naga")).toBe(true);
    expect(isAutoSlug("kepala-naga-1", "Kepala Naga")).toBe(false);
    expect(isAutoSlug("naga-hijau", "Kepala Naga")).toBe(false);
    expect(isAutoSlug("kepala-naga-merah", "Kepala Naga")).toBe(false);
  });

  it("isAutoSlug: judul panjang yang akarnya dipotong uniqueSlug", () => {
    const title = "a".repeat(40) + " " + "b".repeat(39); // slugify → 80 karakter
    const base = `${"a".repeat(40)}-${"b".repeat(39)}`;
    expect(isAutoSlug(base, title)).toBe(true);
    expect(isAutoSlug(`${base.slice(0, 78)}-2`, title)).toBe(true);
  });

  const owners = (slugOwner: string | null, redirectOwner: string | null) => ({ slugOwner, redirectOwner });

  it("slug sama → tidak berubah", () => {
    expect(planSlugChange({ artworkId: "me", current: "naga", next: "naga", owners: owners("me", null) })).toEqual({
      kind: "unchanged",
    });
  });

  it("format tidak valid ditolak", () => {
    for (const next of ["Naga", "naga merah", "-naga", "naga--merah", "", "a".repeat(81)]) {
      expect(planSlugChange({ artworkId: "me", current: "naga", next, owners: owners(null, null) })).toEqual({
        kind: "invalid",
        message: SLUG_ERRORS.format,
      });
    }
  });

  it("slug baru bebas → slug lama dicatat sebagai redirect", () => {
    expect(planSlugChange({ artworkId: "me", current: "naga", next: "naga-merah", owners: owners(null, null) })).toEqual(
      { kind: "change", slug: "naga-merah", addRedirect: "naga", removeRedirect: null },
    );
  });

  it("kembali ke slug lama milik sendiri → redirect itu dihapus", () => {
    expect(planSlugChange({ artworkId: "me", current: "naga-merah", next: "naga", owners: owners(null, "me") })).toEqual(
      { kind: "change", slug: "naga", addRedirect: "naga-merah", removeRedirect: "naga" },
    );
  });

  it("slug atau redirect milik karya lain ditolak", () => {
    expect(planSlugChange({ artworkId: "me", current: "a", next: "b", owners: owners("other", null) })).toEqual({
      kind: "invalid",
      message: SLUG_ERRORS.takenByArtwork,
    });
    expect(planSlugChange({ artworkId: "me", current: "a", next: "b", owners: owners(null, "other") })).toEqual({
      kind: "invalid",
      message: SLUG_ERRORS.takenByRedirect,
    });
  });

  it("isSlugTakenByOther: milik sendiri tidak dianggap terpakai", () => {
    expect(isSlugTakenByOther(owners(null, null))).toBe(false);
    expect(isSlugTakenByOther(owners("x", null))).toBe(true);
    expect(isSlugTakenByOther(owners(null, "x"))).toBe(true);
    expect(isSlugTakenByOther(owners("me", "me"), "me")).toBe(false);
    expect(isSlugTakenByOther(owners("me", "x"), "me")).toBe(true);
  });
});

describe("hapus", () => {
  it("hanya karya Terjual yang tidak boleh dihapus", () => {
    expect(deleteBlockedReason("SOLD")).toMatch(/Arsipkan/);
    for (const a of ["NOT_FOR_SALE", "AVAILABLE", "RESERVED"] as const) expect(deleteBlockedReason(a)).toBeNull();
  });
});
