import "server-only";
// SATU-SATUNYA pintu data Galeri. Setiap query hanya membaca karya Terbit dan hanya memilih field
// publik; hasilnya selalu lewat mapper ke DTO (./dto.ts). Jangan query Artwork untuk Galeri di tempat lain.

import { cache } from "react";
import type { Medium, Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/dal";
import { db } from "@/lib/db";
import { MEDIUMS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { CATALOG_PAGE_SIZE, type CatalogFilters } from "./catalog";
import type {
  GalleryArtworkCard,
  GalleryArtworkDetail,
  GalleryImage,
  GalleryProcessLink,
  GalleryProfile,
} from "./dto";
import { instagramUrl, tiktokUrl } from "./format";

const PUBLISHED = { visibility: "PUBLISHED" } as const satisfies Prisma.ArtworkWhereInput;

const imageSelect = {
  storageKey: true,
  width: true,
  height: true,
  alt: true,
} as const satisfies Prisma.ArtworkImageSelect;

const coverFirst = [{ isCover: "desc" }, { order: "asc" }] as const satisfies Prisma.ArtworkImageOrderByWithRelationInput[];

const cardSelect = {
  slug: true,
  title: true,
  medium: true,
  year: true,
  availability: true,
  priceIdr: true,
  showPrice: true,
  images: { where: { isProcess: false }, orderBy: [...coverFirst], take: 1, select: imageSelect },
} as const satisfies Prisma.ArtworkSelect;

const detailSelect = {
  ...cardSelect,
  summary: true,
  description: true,
  widthCm: true,
  heightCm: true,
  depthCm: true,
  materials: true,
  publishedAt: true,
  updatedAt: true,
  images: { orderBy: [{ isProcess: "asc" }, ...coverFirst], select: { ...imageSelect, isProcess: true } },
  contents: {
    orderBy: { order: "asc" },
    select: {
      content: {
        select: {
          posts: {
            where: { postedAt: { not: null }, url: { not: null } },
            orderBy: { platform: "asc" },
            select: { platform: true, url: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.ArtworkSelect;

type CardRow = Prisma.ArtworkGetPayload<{ select: typeof cardSelect }>;
type DetailRow = Prisma.ArtworkGetPayload<{ select: typeof detailSelect }>;

function toImage(row: { storageKey: string; width: number; height: number; alt: string }, fallbackAlt: string): GalleryImage {
  return { src: routes.media(row.storageKey), width: row.width, height: row.height, alt: row.alt.trim() || fallbackAlt };
}

/** Harga hanya ikut jika boleh ditampilkan. */
function publicPrice(row: Pick<CardRow, "priceIdr" | "showPrice" | "availability">): number | null {
  if (!row.showPrice || row.priceIdr === null || row.availability === "NOT_FOR_SALE") return null;
  return row.priceIdr;
}

function toCard(row: CardRow): GalleryArtworkCard {
  const cover = row.images[0];
  return {
    slug: row.slug,
    title: row.title,
    medium: row.medium,
    year: row.year,
    availability: row.availability,
    priceIdr: publicPrice(row),
    cover: cover ? toImage(cover, row.title) : null,
  };
}

function toDetail(row: DetailRow): GalleryArtworkDetail {
  const main = row.images.filter((img) => !img.isProcess);
  const process = row.images.filter((img) => img.isProcess);
  const seen = new Set<string>();
  const processLinks: GalleryProcessLink[] = [];
  for (const { content } of row.contents) {
    for (const post of content.posts) {
      if (!post.url || seen.has(post.url)) continue;
      seen.add(post.url);
      processLinks.push({ platform: post.platform, url: post.url });
    }
  }
  return {
    ...toCard({ ...row, images: main.slice(0, 1) }),
    summary: row.summary,
    description: row.description,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    depthCm: row.depthCm,
    materials: row.materials,
    images: main.map((img, i) => toImage(img, i === 0 ? row.title : `${row.title}, foto ${i + 1}`)),
    processImages: process.map((img, i) => toImage(img, `${row.title}, proses ${i + 1}`)),
    processLinks,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

// ---- Profil ----

export const getGalleryProfile = cache(async (): Promise<GalleryProfile> => {
  const s = await db.setting.findUnique({
    where: { id: "default" },
    select: {
      siteName: true,
      tagline: true,
      bio: true,
      aboutText: true,
      avatarKey: true,
      city: true,
      whatsapp: true,
      contactEmail: true,
      igHandle: true,
      tiktokHandle: true,
    },
  });
  const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    siteName: blank(s?.siteName) ?? "Galeri & Studio Karya",
    tagline: blank(s?.tagline),
    bio: blank(s?.bio),
    aboutText: blank(s?.aboutText),
    avatarSrc: s?.avatarKey ? routes.media(s.avatarKey) : null,
    city: blank(s?.city),
    whatsapp: blank(s?.whatsapp),
    contactEmail: blank(s?.contactEmail),
    instagramUrl: instagramUrl(s?.igHandle),
    tiktokUrl: tiktokUrl(s?.tiktokHandle),
  };
});

// ---- Daftar karya ----

/** Karya unggulan untuk Beranda (urutan dari Studio). */
export async function getFeaturedArtworks(limit = 8): Promise<GalleryArtworkCard[]> {
  const rows = await db.artwork.findMany({
    where: { ...PUBLISHED, isFeatured: true },
    orderBy: [{ featuredOrder: "asc" }, { publishedAt: "desc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Karya terbaru yang terbit. */
export async function getLatestArtworks(limit = 6): Promise<GalleryArtworkCard[]> {
  const rows = await db.artwork.findMany({
    where: PUBLISHED,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Jumlah karya terbit per medium (pintasan Beranda). */
export async function getMediumCounts(): Promise<Partial<Record<Medium, number>>> {
  const groups = await db.artwork.groupBy({ by: ["medium"], where: PUBLISHED, _count: { _all: true } });
  const counts: Partial<Record<Medium, number>> = {};
  for (const g of groups) if (g.medium) counts[g.medium] = g._count._all;
  return counts;
}

export type GalleryMediumShortcut = { medium: Medium; count: number; cover: GalleryImage | null };

/**
 * Pintasan medium Beranda: jumlah karya Terbit per medium + satu cover (unggulan dulu, lalu terbaru).
 * Medium tanpa karya Terbit tidak dikembalikan. Urutan mengikuti MEDIUMS (Gambar, Clay, Campuran).
 */
export async function getMediumShortcuts(): Promise<GalleryMediumShortcut[]> {
  const counts = await getMediumCounts();
  const mediums = MEDIUMS.filter((m) => (counts[m] ?? 0) > 0);
  return Promise.all(
    mediums.map(async (medium) => {
      const row = await db.artwork.findFirst({
        where: { ...PUBLISHED, medium, images: { some: { isProcess: false } } },
        orderBy: [{ isFeatured: "desc" }, { featuredOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }],
        select: cardSelect,
      });
      return { medium, count: counts[medium] ?? 0, cover: row ? toCard(row).cover : null };
    }),
  );
}

function catalogWhere(filters: CatalogFilters): Prisma.ArtworkWhereInput {
  return {
    ...PUBLISHED,
    ...(filters.medium ? { medium: filters.medium } : {}),
    ...(filters.status === "AVAILABLE" ? { availability: "AVAILABLE" } : {}),
    ...(filters.status === "UNAVAILABLE" ? { availability: { in: ["SOLD", "RESERVED", "NOT_FOR_SALE"] } } : {}),
    ...(filters.year ? { year: filters.year } : {}),
    ...(filters.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
  };
}

/** Katalog: halaman 1..`filters.page` sekaligus (tombol "Muat lagi" menaikkan `page`). */
export async function getCatalog(filters: CatalogFilters): Promise<{ items: GalleryArtworkCard[]; total: number }> {
  const where = catalogWhere(filters);
  const orderBy: Prisma.ArtworkOrderByWithRelationInput[] =
    filters.sort === "unggulan"
      ? [{ isFeatured: "desc" }, { featuredOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }]
      : [{ publishedAt: "desc" }, { id: "asc" }];
  const [rows, total] = await Promise.all([
    db.artwork.findMany({ where, orderBy, take: filters.page * CATALOG_PAGE_SIZE, select: cardSelect }),
    db.artwork.count({ where }),
  ]);
  return { items: rows.map(toCard), total };
}

/** Tahun yang punya karya terbit (filter katalog), terbaru dulu. */
export async function getCatalogYears(): Promise<number[]> {
  const rows = await db.artwork.findMany({
    where: { ...PUBLISHED, year: { not: null } },
    distinct: ["year"],
    orderBy: { year: "desc" },
    select: { year: true },
  });
  return rows.map((r) => r.year).filter((y): y is number => y !== null);
}

// ---- Detail ----

export type GalleryArtworkLookup =
  | { kind: "found"; artwork: GalleryArtworkDetail }
  | { kind: "redirect"; slug: string }
  | null;

/** Detail karya Terbit berdasarkan slug; slug lama → arahkan ke slug baru; selain itu null (404). */
export const getGalleryArtwork = cache(async (slug: string): Promise<GalleryArtworkLookup> => {
  const row = await db.artwork.findFirst({ where: { ...PUBLISHED, slug }, select: detailSelect });
  if (row) return { kind: "found", artwork: toDetail(row) };

  const redirect = await db.artworkSlugRedirect.findUnique({
    where: { oldSlug: slug },
    select: { artwork: { select: { slug: true, visibility: true } } },
  });
  if (redirect && redirect.artwork.visibility === "PUBLISHED" && redirect.artwork.slug !== slug) {
    return { kind: "redirect", slug: redirect.artwork.slug };
  }
  return null;
});

/** Karya lain dengan medium yang sama (tanpa karya ini). */
export async function getRelatedArtworks(
  artwork: Pick<GalleryArtworkDetail, "slug" | "medium">,
  limit = 4,
): Promise<GalleryArtworkCard[]> {
  if (!artwork.medium) return [];
  const rows = await db.artwork.findMany({
    where: { ...PUBLISHED, medium: artwork.medium, slug: { not: artwork.slug } },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Slug semua karya Terbit untuk sitemap. */
export async function getSitemapArtworks(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.artwork.findMany({
    where: PUBLISHED,
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });
}

// ---- Pratinjau Studio ----

/**
 * Pratinjau karya (status apa pun) dengan bentuk data yang sama persis dengan Galeri.
 * Hanya untuk /studio/karya/[id]/pratinjau, dijaga requireAdmin().
 */
export async function getArtworkPreview(id: string): Promise<GalleryArtworkDetail | null> {
  await requireAdmin();
  const row = await db.artwork.findUnique({ where: { id }, select: detailSelect });
  return row ? toDetail(row) : null;
}
