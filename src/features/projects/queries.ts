import "server-only";
import { cache } from "react";
import type { ProjectStage } from "@prisma/client";
import { db } from "@/lib/db";

const latestPhotoFirst = [
  { takenAt: { sort: "desc" as const, nulls: "last" as const } },
  { createdAt: "desc" as const },
];

/** Daftar proyek + jumlah konten, jumlah Posted, jumlah karya, dan foto progres terbaru. */
export async function getProjects(filter: { stage?: ProjectStage } = {}) {
  const rows = await db.project.findMany({
    where: filter.stage ? { stage: filter.stage } : undefined,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      contents: { select: { stage: true } },
      photos: {
        orderBy: latestPhotoFirst,
        take: 1,
        select: { url: true, storageKey: true, width: true, height: true, caption: true },
      },
      _count: { select: { artworks: true } },
    },
  });

  return rows.map(({ contents, photos, _count, ...project }) => ({
    ...project,
    contentCount: contents.length,
    postedCount: contents.filter((c) => c.stage === "POSTED").length,
    artworkCount: _count.artworks,
    latestPhoto: photos[0] ?? null,
  }));
}
export type ProjectListItem = Awaited<ReturnType<typeof getProjects>>[number];

/**
 * Detail proyek: konten urut nomor part, foto terbaru dulu. `null` jika tidak ada.
 * Di-`cache` per request karena dipakai `generateMetadata` dan halaman.
 */
export const getProject = cache(async (id: string) => {
  return db.project.findUnique({
    where: { id },
    include: {
      contents: {
        orderBy: [{ seriesPart: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          seriesPart: true,
          stage: true,
          pillar: { select: { id: true, name: true, color: true } },
          format: { select: { name: true } },
        },
      },
      photos: { orderBy: latestPhotoFirst },
    },
  });
});
export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProject>>>;

/**
 * Karya yang berasal dari proyek ini (semua status, data Studio; bukan untuk Galeri), terbaru dulu.
 * Cover: foto bertanda cover, selain itu foto karya jadi pertama, baru foto proses.
 */
export async function getProjectArtworks(projectId: string) {
  const rows = await db.artwork.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      visibility: true,
      year: true,
      images: {
        orderBy: [{ isCover: "desc" }, { isProcess: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { storageKey: true, width: true, height: true, alt: true },
      },
    },
  });
  return rows.map(({ images, ...artwork }) => ({ ...artwork, cover: images[0] ?? null }));
}
export type ProjectArtworkItem = Awaited<ReturnType<typeof getProjectArtworks>>[number];
