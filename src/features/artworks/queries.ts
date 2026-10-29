import "server-only";
// Data Studio untuk menu Karya. Halaman yang memanggil ini sudah dijaga requireAdmin().

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ArtworkListFilters } from "./filters";
import { publishProblems, resolveCoverId } from "./rules";

const imageOrder = [{ order: "asc" }, { createdAt: "asc" }] as const satisfies Prisma.ArtworkImageOrderByWithRelationInput[];

/** Daftar karya (terbaru diubah dulu) + cover + syarat terbit yang belum terpenuhi. */
export async function getArtworkList(filters: ArtworkListFilters) {
  const rows = await db.artwork.findMany({
    where: {
      ...(filters.visibility ? { visibility: filters.visibility } : {}),
      ...(filters.medium ? { medium: filters.medium } : {}),
      ...(filters.availability ? { availability: filters.availability } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      medium: true,
      year: true,
      visibility: true,
      availability: true,
      isFeatured: true,
      featuredOrder: true,
      priceIdr: true,
      showPrice: true,
      images: {
        orderBy: imageOrder,
        select: { id: true, storageKey: true, width: true, height: true, alt: true, isCover: true, isProcess: true, order: true },
      },
    },
  });

  return rows.map(({ images, ...artwork }) => {
    const coverId = resolveCoverId(images);
    const cover = images.find((img) => img.id === coverId) ?? null;
    return {
      ...artwork,
      cover: cover ? { storageKey: cover.storageKey, width: cover.width, height: cover.height, alt: cover.alt } : null,
      imageCount: images.length,
      problemCount: publishProblems({ ...artwork, images }).length,
    };
  });
}
export type ArtworkListItem = Awaited<ReturnType<typeof getArtworkList>>[number];

/** Detail karya untuk form Studio; `null` jika tidak ada. Di-cache per request (metadata + halaman). */
export const getArtwork = cache(async (id: string) => {
  return db.artwork.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, title: true } },
      images: {
        orderBy: imageOrder,
        select: {
          id: true,
          storageKey: true,
          width: true,
          height: true,
          alt: true,
          order: true,
          isCover: true,
          isProcess: true,
        },
      },
      contents: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          content: {
            select: {
              id: true,
              title: true,
              stage: true,
              posts: {
                where: { url: { not: null } },
                orderBy: { platform: "asc" },
                select: { platform: true, url: true, postedAt: true },
              },
            },
          },
        },
      },
    },
  });
});
export type ArtworkDetail = NonNullable<Awaited<ReturnType<typeof getArtwork>>>;
export type ArtworkImageItem = ArtworkDetail["images"][number];

/** Status singkat untuk banner pratinjau. */
export async function getArtworkStatus(id: string) {
  return db.artwork.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, visibility: true, publishedAt: true },
  });
}

/** Pilihan form detail: proyek asal dan konten Posted (calon video proses). */
export async function getArtworkFormOptions() {
  const [projects, postedContents] = await Promise.all([
    db.project.findMany({ orderBy: [{ updatedAt: "desc" }], select: { id: true, title: true } }),
    db.content.findMany({
      where: { stage: "POSTED" },
      orderBy: [{ stageChangedAt: "desc" }, { id: "asc" }],
      take: 300,
      select: {
        id: true,
        title: true,
        stageChangedAt: true,
        posts: {
          where: { url: { not: null } },
          orderBy: { platform: "asc" },
          select: { platform: true, url: true, postedAt: true },
        },
      },
    }),
  ]);
  return { projects, postedContents };
}
export type ArtworkFormOptions = Awaited<ReturnType<typeof getArtworkFormOptions>>;
export type PostedContentOption = ArtworkFormOptions["postedContents"][number];
