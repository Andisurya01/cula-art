// Filter katalog /karya di URL (fungsi murni): ?medium=CLAY&status=AVAILABLE&tahun=2026&q=naga&urut=unggulan&halaman=2

import type { Medium } from "@prisma/client";
import { MEDIUMS } from "@/lib/labels";
import { routes } from "@/lib/routes";

export const CATALOG_PAGE_SIZE = 24;
/** Batas `halaman` (24 × 50 karya); di atas ini tombol "Muat lagi" tidak ditampilkan. */
export const CATALOG_MAX_PAGE = 50;

/** Ketersediaan di katalog: Tersedia, atau Terjual/Koleksi (termasuk Dipesan). */
export const CATALOG_STATUSES = ["AVAILABLE", "UNAVAILABLE"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const CATALOG_SORTS = ["terbaru", "unggulan"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export type CatalogFilters = {
  medium: Medium | null;
  status: CatalogStatus | null;
  year: number | null;
  q: string;
  sort: CatalogSort;
  /** Halaman 1..N; "Muat lagi" menampilkan halaman 1 sampai `page`. */
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogParams(params: SearchParams): CatalogFilters {
  const medium = first(params.medium);
  const status = first(params.status);
  const year = Number(first(params.tahun));
  const sort = first(params.urut);
  const page = Number(first(params.halaman));
  return {
    medium: MEDIUMS.find((m) => m === medium) ?? null,
    status: CATALOG_STATUSES.find((s) => s === status) ?? null,
    year: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null,
    q: (first(params.q) ?? "").trim().slice(0, 100),
    sort: CATALOG_SORTS.find((s) => s === sort) ?? "terbaru",
    page: Number.isInteger(page) && page >= 1 && page <= CATALOG_MAX_PAGE ? page : 1,
  };
}

/** URL katalog untuk filter tertentu; nilai default tidak ditulis supaya URL tetap pendek. */
export function catalogHref(filters: Partial<CatalogFilters>): string {
  const search = new URLSearchParams();
  if (filters.medium) search.set("medium", filters.medium);
  if (filters.status) search.set("status", filters.status);
  if (filters.year) search.set("tahun", String(filters.year));
  if (filters.q) search.set("q", filters.q);
  if (filters.sort && filters.sort !== "terbaru") search.set("urut", filters.sort);
  if (filters.page && filters.page > 1) search.set("halaman", String(filters.page));
  const query = search.toString();
  return query ? `${routes.gallery.catalog}?${query}` : routes.gallery.catalog;
}

/** Ada filter/pencarian aktif (urutan dan halaman tidak dihitung). */
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(filters.medium || filters.status || filters.year || filters.q);
}

/**
 * URL katalog dari isi form filter (nilai kosong dibuang, halaman kembali ke 1). Dipakai saat form
 * dikirim dengan JS; tanpa JS form GET biasa tetap jalan karena `parseCatalogParams` menerima nilai kosong.
 */
export function catalogHrefFromForm(entries: Iterable<[string, FormDataEntryValue]>): string {
  const params: Record<string, string> = {};
  for (const [name, value] of entries) if (typeof value === "string") params[name] = value;
  return catalogHref({ ...parseCatalogParams(params), page: 1 });
}
