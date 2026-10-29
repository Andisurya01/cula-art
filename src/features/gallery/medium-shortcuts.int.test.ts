// Integrasi: pintasan medium Beranda hanya dari karya Terbit (Draft/Arsip tidak dihitung dan
// fotonya tidak pernah dipakai sebagai cover), tanpa field internal atau harga.

import { beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { getMediumShortcuts } from "./queries";

let keyCounter = 0;
const key = (prefix: string) => `${prefix}${String(++keyCounter).padStart(32 - prefix.length, "0")}.webp`;

async function artwork(
  data: Partial<Prisma.ArtworkUncheckedCreateInput> & { slug: string },
  images: { prefix: string; isProcess?: boolean }[] = [{ prefix: "a" }],
) {
  return db.artwork.create({
    data: {
      title: data.slug,
      medium: "CLAY",
      year: 2026,
      visibility: "PUBLISHED",
      publishedAt: new Date(),
      ...data,
      images: {
        create: images.map((img, i) => ({
          storageKey: key(img.prefix),
          width: 800,
          height: 1000,
          alt: `Foto ${data.slug}`,
          isCover: i === 0,
          isProcess: img.isProcess ?? false,
        })),
      },
    },
  });
}

beforeEach(resetDatabase);

describe("getMediumShortcuts", () => {
  it("tanpa karya Terbit → kosong", async () => {
    await artwork({ slug: "draft", visibility: "DRAFT", publishedAt: null });
    expect(await getMediumShortcuts()).toEqual([]);
  });

  it("jumlah dan cover hanya dari karya Terbit; unggulan dipilih dulu; urutan Gambar, Clay, Campuran", async () => {
    await artwork({ slug: "clay-baru", publishedAt: new Date(Date.UTC(2026, 9, 20)) }, [{ prefix: "c" }]);
    await artwork(
      { slug: "clay-unggulan", isFeatured: true, publishedAt: new Date(Date.UTC(2026, 0, 1)) },
      [{ prefix: "f" }],
    );
    // Draft & Arsip unggulan bermedium Gambar: tidak boleh dihitung atau dipakai cover.
    await artwork({ slug: "gambar-draft", medium: "DRAWING", visibility: "DRAFT", isFeatured: true }, [{ prefix: "d" }]);
    await artwork({ slug: "gambar-arsip", medium: "DRAWING", visibility: "ARCHIVED", isFeatured: true }, [{ prefix: "e" }]);
    await artwork({ slug: "gambar-terbit", medium: "DRAWING", priceIdr: 77_777_777, showPrice: false }, [{ prefix: "b" }]);

    const shortcuts = await getMediumShortcuts();
    expect(shortcuts.map((s) => [s.medium, s.count])).toEqual([
      ["DRAWING", 1],
      ["CLAY", 2],
    ]);
    expect(shortcuts[0].cover?.src).toMatch(/^\/media\/b0+\d+\.webp$/);
    expect(shortcuts[1].cover?.src).toMatch(/^\/media\/f0+\d+\.webp$/);

    const text = JSON.stringify(shortcuts);
    for (const forbidden of ["/media/d", "/media/e", "gambar-draft", "gambar-arsip", "77777777", "storageKey", "visibility"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("cover tidak memakai foto proses; karya tanpa foto karya jadi dilewati sebagai sumber cover", async () => {
    await artwork({ slug: "hanya-proses", isFeatured: true }, [{ prefix: "p", isProcess: true }]);
    await artwork({ slug: "berfoto" }, [{ prefix: "g" }]);
    const [clay] = await getMediumShortcuts();
    expect(clay.count).toBe(2);
    expect(clay.cover?.src).toMatch(/^\/media\/g0+\d+\.webp$/);
  });
});
