// Integrasi ke galeri_test: query Galeri tidak pernah mengembalikan karya Draft/Arsip,
// harga tersembunyi, atau field internal.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { fakeRequest } from "@/test/next-headers";
import { parseCatalogParams } from "./catalog";
import {
  getArtworkPreview,
  getCatalog,
  getCatalogYears,
  getFeaturedArtworks,
  getGalleryArtwork,
  getGalleryProfile,
  getLatestArtworks,
  getMediumCounts,
  getRelatedArtworks,
  getSitemapArtworks,
} from "./queries";

vi.mock("next/headers", async () => (await import("@/test/next-headers")).nextHeadersMock());

const HIDDEN_PRICE = 98_765_432;
let keyCounter = 0;
const key = () => `${String(++keyCounter).padStart(32, "0")}.webp`;

async function artwork(data: Partial<Prisma.ArtworkUncheckedCreateInput> & { slug: string }) {
  return db.artwork.create({
    data: {
      title: data.slug.replace(/-/g, " "),
      medium: "CLAY",
      year: 2026,
      visibility: "PUBLISHED",
      publishedAt: new Date(),
      ...data,
      images: { create: [{ storageKey: key(), width: 800, height: 1000, alt: "Foto", isCover: true }] },
    },
  });
}

/** Semua string/angka yang dikirim ke halaman, untuk memastikan nilai rahasia tidak ikut. */
function serialized(value: unknown): string {
  return JSON.stringify(value);
}

beforeEach(async () => {
  await resetDatabase();
  fakeRequest.reset();
});

describe("batas data Galeri", () => {
  beforeEach(async () => {
    await artwork({ slug: "terbit-dijual", availability: "AVAILABLE", priceIdr: 1_500_000, showPrice: true, isFeatured: true });
    await artwork({ slug: "terbit-harga-rahasia", availability: "AVAILABLE", priceIdr: HIDDEN_PRICE, showPrice: false, isFeatured: true });
    await artwork({ slug: "koleksi-harga-tampil", availability: "NOT_FOR_SALE", priceIdr: HIDDEN_PRICE + 1, showPrice: true });
    await artwork({ slug: "draft-rahasia", visibility: "DRAFT", publishedAt: null, isFeatured: true, priceIdr: 5, showPrice: true });
    await artwork({ slug: "arsip-rahasia", visibility: "ARCHIVED", isFeatured: true });
  });

  it("karya Draft/Arsip tidak pernah muncul di daftar mana pun", async () => {
    const lists = [
      await getFeaturedArtworks(),
      await getLatestArtworks(50),
      (await getCatalog(parseCatalogParams({}))).items,
      (await getCatalog(parseCatalogParams({ urut: "unggulan", halaman: "5" }))).items,
      await getRelatedArtworks({ slug: "x", medium: "CLAY" }, 50),
    ];
    for (const list of lists) {
      const slugs = list.map((a) => a.slug);
      expect(slugs).not.toContain("draft-rahasia");
      expect(slugs).not.toContain("arsip-rahasia");
    }
    const sitemap = (await getSitemapArtworks()).map((a) => a.slug);
    expect(sitemap.sort()).toEqual(["koleksi-harga-tampil", "terbit-dijual", "terbit-harga-rahasia"]);
    expect((await getCatalog(parseCatalogParams({}))).total).toBe(3);
  });

  it("detail Draft/Arsip → null (404), bukan data", async () => {
    expect(await getGalleryArtwork("draft-rahasia")).toBeNull();
    expect(await getGalleryArtwork("arsip-rahasia")).toBeNull();
    expect(await getGalleryArtwork("tidak-ada")).toBeNull();
  });

  it("harga hanya dikirim jika showPrice dan bukan Koleksi pribadi", async () => {
    const items = (await getCatalog(parseCatalogParams({}))).items;
    const price = Object.fromEntries(items.map((a) => [a.slug, a.priceIdr]));
    expect(price).toEqual({
      "terbit-dijual": 1_500_000,
      "terbit-harga-rahasia": null,
      "koleksi-harga-tampil": null,
    });

    const detail = await getGalleryArtwork("terbit-harga-rahasia");
    expect(detail?.kind).toBe("found");
    const all = serialized([items, detail, await getFeaturedArtworks(), await getLatestArtworks()]);
    expect(all).not.toContain(String(HIDDEN_PRICE));
    expect(all).not.toContain(String(HIDDEN_PRICE + 1));
    expect(all).not.toContain("showPrice");
  });

  it("DTO tanpa field internal (id, visibility, berat, proyek, unggulan, storageKey)", async () => {
    const detail = await getGalleryArtwork("terbit-dijual");
    if (detail?.kind !== "found") throw new Error("harus ditemukan");
    const keys = Object.keys(detail.artwork).sort();
    expect(keys).toEqual(
      [
        "availability", "cover", "depthCm", "description", "heightCm", "images", "materials", "medium",
        "priceIdr", "processImages", "processLinks", "publishedAt", "slug", "summary", "title", "updatedAt",
        "widthCm", "year",
      ].sort(),
    );
    const text = serialized(detail);
    for (const forbidden of ["visibility", "weightGram", "projectId", "isFeatured", "featuredOrder", "storageKey", '"id"']) {
      expect(text).not.toContain(forbidden);
    }
    expect(detail.artwork.cover?.src).toMatch(/^\/media\/[0-9]{32}\.webp$/);
  });

  it("unggulan hanya karya Terbit, urut featuredOrder", async () => {
    expect((await getFeaturedArtworks()).map((a) => a.slug).sort()).toEqual(["terbit-dijual", "terbit-harga-rahasia"]);
  });

  it("jumlah per medium dan tahun hanya dari karya Terbit", async () => {
    await artwork({ slug: "draft-gambar", medium: "DRAWING", year: 1999, visibility: "DRAFT" });
    expect(await getMediumCounts()).toEqual({ CLAY: 3 });
    expect(await getCatalogYears()).toEqual([2026]);
  });
});

describe("katalog", () => {
  it("filter medium, ketersediaan, tahun, pencarian judul (tanpa beda huruf besar/kecil)", async () => {
    await artwork({ slug: "kepala-naga", title: "Kepala Naga", medium: "CLAY", availability: "AVAILABLE", year: 2025 });
    await artwork({ slug: "studi-tangan", title: "Studi Tangan", medium: "DRAWING", availability: "SOLD", year: 2026 });
    await artwork({ slug: "naga-kecil", title: "Naga Kecil", medium: "CLAY", availability: "RESERVED", year: 2026 });

    const slugs = async (params: Record<string, string>) =>
      (await getCatalog(parseCatalogParams(params))).items.map((a) => a.slug).sort();
    expect(await slugs({ medium: "CLAY" })).toEqual(["kepala-naga", "naga-kecil"]);
    expect(await slugs({ status: "AVAILABLE" })).toEqual(["kepala-naga"]);
    expect(await slugs({ status: "UNAVAILABLE" })).toEqual(["naga-kecil", "studi-tangan"]);
    expect(await slugs({ tahun: "2026" })).toEqual(["naga-kecil", "studi-tangan"]);
    expect(await slugs({ q: "NAGA" })).toEqual(["kepala-naga", "naga-kecil"]);
  });

  it("24 per halaman; halaman 2 menampilkan 48 pertama", async () => {
    for (let i = 0; i < 30; i++) await artwork({ slug: `karya-${i}`, publishedAt: new Date(Date.UTC(2026, 0, 1 + i)) });
    const page1 = await getCatalog(parseCatalogParams({}));
    expect(page1.items).toHaveLength(24);
    expect(page1.total).toBe(30);
    expect(page1.items[0].slug).toBe("karya-29");
    expect((await getCatalog(parseCatalogParams({ halaman: "2" }))).items).toHaveLength(30);
  });
});

describe("detail", () => {
  it("foto karya (cover dulu) terpisah dari foto proses; tautan proses dari post Posted", async () => {
    const created = await artwork({ slug: "naga", title: "Naga" });
    await db.artworkImage.createMany({
      data: [
        { artworkId: created.id, storageKey: key(), width: 10, height: 10, alt: "", order: 1 },
        { artworkId: created.id, storageKey: key(), width: 10, height: 10, alt: "Armature", isProcess: true },
      ],
    });
    const pillar = await db.pillar.create({ data: { name: "Proses Clay", color: "#f97316" } });
    const content = await db.content.create({
      data: {
        title: "Time-lapse naga",
        pillarId: pillar.id,
        stage: "POSTED",
        posts: {
          create: [
            { platform: "TIKTOK", postType: "VIDEO", postedAt: new Date(), url: "https://www.tiktok.com/@a/video/1" },
            { platform: "INSTAGRAM", postType: "REEL", scheduledAt: new Date() },
          ],
        },
      },
    });
    await db.artworkContent.create({ data: { artworkId: created.id, contentId: content.id } });

    const result = await getGalleryArtwork("naga");
    if (result?.kind !== "found") throw new Error("harus ditemukan");
    const { artwork: detail } = result;
    expect(detail.images).toHaveLength(2);
    expect(detail.images[0].alt).toBe("Foto");
    expect(detail.images[1].alt).toBe("Naga, foto 2"); // alt kosong → judul
    expect(detail.processImages.map((i) => i.alt)).toEqual(["Armature"]);
    expect(detail.processLinks).toEqual([{ platform: "TIKTOK", url: "https://www.tiktok.com/@a/video/1" }]);
    expect(serialized(detail)).not.toContain("Time-lapse naga");
  });

  it("slug lama diarahkan ke slug baru; slug lama dari karya Draft tidak", async () => {
    const live = await artwork({ slug: "naga-merah" });
    const draft = await artwork({ slug: "rahasia-baru", visibility: "DRAFT" });
    await db.artworkSlugRedirect.createMany({
      data: [
        { oldSlug: "naga", artworkId: live.id },
        { oldSlug: "rahasia-lama", artworkId: draft.id },
      ],
    });
    expect(await getGalleryArtwork("naga")).toEqual({ kind: "redirect", slug: "naga-merah" });
    expect(await getGalleryArtwork("rahasia-lama")).toBeNull();
  });

  it("karya lain: medium sama, tanpa karya ini", async () => {
    await artwork({ slug: "a", medium: "CLAY" });
    await artwork({ slug: "b", medium: "CLAY" });
    await artwork({ slug: "c", medium: "DRAWING" });
    expect((await getRelatedArtworks({ slug: "a", medium: "CLAY" })).map((x) => x.slug)).toEqual(["b"]);
  });
});

describe("profil dan pratinjau", () => {
  it("profil: field kosong menjadi null, handle menjadi URL", async () => {
    await db.setting.create({
      data: { id: "default", siteName: "Galeri Andi", tagline: "  ", igHandle: "@andi.gambar", whatsapp: "6281234567890" },
    });
    expect(await getGalleryProfile()).toMatchObject({
      siteName: "Galeri Andi",
      tagline: null,
      instagramUrl: "https://www.instagram.com/andi.gambar/",
      tiktokUrl: null,
      whatsapp: "6281234567890",
    });
  });

  it("pratinjau Draft butuh login (tanpa sesi → redirect /masuk)", async () => {
    const draft = await artwork({ slug: "draft", visibility: "DRAFT" });
    await expect(getArtworkPreview(draft.id)).rejects.toMatchObject({ digest: expect.stringContaining("/masuk") });
  });
});
