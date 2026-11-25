// Integrasi: statistik publik Beranda (pil statistik, "Sejak {tahun}") hanya dihitung dari karya
// Terbit; karya Draft/Arsip tidak menambah jumlah, medium, atau rentang tahun.

import { beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { getGalleryStats } from "./queries";

async function artwork(data: Partial<Prisma.ArtworkUncheckedCreateInput> & { slug: string }) {
  return db.artwork.create({
    data: {
      title: data.slug,
      medium: "CLAY",
      year: 2026,
      visibility: "PUBLISHED",
      publishedAt: new Date(),
      ...data,
    },
  });
}

beforeEach(resetDatabase);

describe("getGalleryStats", () => {
  it("kosong: nol karya, tanpa medium, tanpa tahun", async () => {
    expect(await getGalleryStats()).toEqual({ artworkCount: 0, mediums: [], firstYear: null, lastYear: null });
  });

  it("hanya karya Terbit: jumlah, medium (urut Gambar, Clay, Campuran), dan rentang tahun", async () => {
    await artwork({ slug: "clay-2025", medium: "CLAY", year: 2025 });
    await artwork({ slug: "gambar-2024", medium: "DRAWING", year: 2024 });
    await artwork({ slug: "clay-2026", medium: "CLAY", year: 2026 });
    // Draft/Arsip dengan medium dan tahun lain tidak boleh ikut dihitung.
    await artwork({ slug: "draft-campuran", medium: "MIXED", year: 1990, visibility: "DRAFT", publishedAt: null });
    await artwork({ slug: "arsip-campuran", medium: "MIXED", year: 2030, visibility: "ARCHIVED" });

    expect(await getGalleryStats()).toEqual({
      artworkCount: 3,
      mediums: ["DRAWING", "CLAY"],
      firstYear: 2024,
      lastYear: 2026,
    });
  });

  it("karya tanpa tahun tetap dihitung, tetapi tidak memengaruhi rentang tahun", async () => {
    await artwork({ slug: "tanpa-tahun", year: null });
    expect(await getGalleryStats()).toEqual({ artworkCount: 1, mediums: ["CLAY"], firstYear: null, lastYear: null });
  });

  it("hanya field statistik (tanpa slug, judul, harga, atau id)", async () => {
    await artwork({ slug: "rahasia-slug", title: "Judul Rahasia", priceIdr: 123_456, showPrice: false });
    const stats = await getGalleryStats();
    expect(Object.keys(stats).sort()).toEqual(["artworkCount", "firstYear", "lastYear", "mediums"]);
    const text = JSON.stringify(stats);
    for (const forbidden of ["rahasia-slug", "Judul Rahasia", "123456", '"id"']) expect(text).not.toContain(forbidden);
  });
});
