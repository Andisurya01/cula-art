// Integrasi: query Studio proyek — "Karya dari proyek ini" dan jumlah karya di daftar proyek.

import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { getProjectArtworks, getProjects } from "./queries";

let keyCounter = 0;
const key = () => `${(++keyCounter).toString(16).padStart(32, "0")}.webp`;

async function project(title: string) {
  return db.project.create({ data: { title, medium: "CLAY" } });
}

beforeEach(resetDatabase);

describe("getProjectArtworks", () => {
  it("hanya karya proyek ini (semua status), terbaru dulu, dengan cover", async () => {
    const naga = await project("Patung kepala naga");
    const lain = await project("Proyek lain");
    const coverKey = key();
    const firstFinishedKey = key();

    const draft = await db.artwork.create({
      data: {
        slug: "naga-draft",
        title: "Naga (draft)",
        projectId: naga.id,
        createdAt: new Date("2026-10-01T00:00:00Z"),
        images: {
          create: [
            // Foto proses di urutan pertama tidak dipilih selama ada foto karya jadi.
            { storageKey: key(), width: 10, height: 10, order: 0, isProcess: true },
            { storageKey: firstFinishedKey, width: 800, height: 600, order: 1, alt: "Naga jadi" },
            { storageKey: key(), width: 10, height: 10, order: 2 },
          ],
        },
      },
    });
    const published = await db.artwork.create({
      data: {
        slug: "naga-terbit",
        title: "Naga",
        projectId: naga.id,
        visibility: "PUBLISHED",
        publishedAt: new Date(),
        year: 2026,
        createdAt: new Date("2026-10-10T00:00:00Z"),
        images: {
          create: [
            { storageKey: key(), width: 10, height: 10, order: 0 },
            { storageKey: coverKey, width: 1200, height: 900, order: 3, isCover: true, alt: "Cover" },
          ],
        },
      },
    });
    const archived = await db.artwork.create({
      data: {
        slug: "naga-arsip",
        title: "Naga lama",
        projectId: naga.id,
        visibility: "ARCHIVED",
        createdAt: new Date("2026-09-01T00:00:00Z"),
      },
    });
    await db.artwork.create({ data: { slug: "lain", title: "Lain", projectId: lain.id } });
    await db.artwork.create({ data: { slug: "tanpa-proyek", title: "Tanpa proyek" } });

    const rows = await getProjectArtworks(naga.id);
    expect(rows.map((r) => r.id)).toEqual([published.id, draft.id, archived.id]);
    expect(rows[0]).toEqual({
      id: published.id,
      title: "Naga",
      visibility: "PUBLISHED",
      year: 2026,
      cover: { storageKey: coverKey, width: 1200, height: 900, alt: "Cover" },
    });
    expect(rows[1].cover?.storageKey).toBe(firstFinishedKey);
    expect(rows[2]).toMatchObject({ visibility: "ARCHIVED", cover: null, year: null });
  });

  it("proyek tanpa karya → kosong", async () => {
    const p = await project("Kosong");
    expect(await getProjectArtworks(p.id)).toEqual([]);
  });
});

describe("getProjects", () => {
  it("menghitung karya per proyek dan menyertakan ukuran foto terbaru", async () => {
    const naga = await project("Naga");
    const kosong = await project("Kosong");
    await db.artwork.create({ data: { slug: "a", title: "A", projectId: naga.id } });
    await db.artwork.create({ data: { slug: "b", title: "B", projectId: naga.id } });
    const photoKey = key();
    await db.projectPhoto.create({
      data: { projectId: naga.id, storageKey: photoKey, width: 640, height: 480, takenAt: new Date() },
    });
    await db.projectPhoto.create({
      data: { projectId: naga.id, url: "https://contoh.id/lama.jpg", takenAt: new Date("2026-01-01T00:00:00Z") },
    });

    const rows = await getProjects();
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(naga.id)?.artworkCount).toBe(2);
    expect(byId.get(naga.id)?.latestPhoto).toEqual({
      url: null,
      storageKey: photoKey,
      width: 640,
      height: 480,
      caption: null,
    });
    expect(byId.get(kosong.id)).toMatchObject({ artworkCount: 0, latestPhoto: null });
    expect(byId.get(naga.id)).not.toHaveProperty("_count");
  });
});
