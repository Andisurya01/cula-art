// Filter dan paginasi daftar Postingan (fungsi murni, aman di client dan server).
// Parameter URL: platform, pilar, status, dari, sampai, halaman.

import type { Platform } from "@prisma/client";
import { isMetricDue, type MetricStatus } from "@/lib/analytics/snapshots";
import { addWibDays, isValidWibDateString, wibToUtc } from "@/lib/date";
import { METRIC_STATUSES, PLATFORMS } from "@/lib/labels";

export const POSTS_PER_PAGE = 20;

/** `PERLU` = Perlu H+1 atau Perlu H+7. */
export const POST_STATUS_FILTERS = ["PERLU", ...METRIC_STATUSES] as const;
export type PostStatusFilter = "PERLU" | MetricStatus;

export type PostFilters = {
  /** `null` = semua platform. */
  platform: Platform | null;
  pillarId: string | null;
  status: PostStatusFilter | null;
  /** `yyyy-MM-dd` WIB, inklusif. */
  from: string | null;
  /** `yyyy-MM-dd` WIB, inklusif. */
  to: string | null;
};

export const EMPTY_POST_FILTERS: PostFilters = {
  platform: null,
  pillarId: null,
  status: null,
  from: null,
  to: null,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(list: readonly T[], value: string | undefined): T | null {
  return value !== undefined && (list as readonly string[]).includes(value) ? (value as T) : null;
}

function parseDate(value: string | undefined): string | null {
  const text = value?.trim();
  return text && isValidWibDateString(text) ? text : null;
}

/**
 * Search params → filter. Nilai tidak valid diabaikan. Rentang terbalik: `sampai` diabaikan.
 * `knownPillarIds` (opsional): pilar di luar daftar ini diabaikan, supaya id basi tidak mengosongkan daftar.
 */
export function parsePostFilters(params: RawSearchParams, knownPillarIds?: readonly string[]): PostFilters {
  const pillarId = first(params.pilar)?.trim() || null;
  const from = parseDate(first(params.dari));
  const to = parseDate(first(params.sampai));
  return {
    platform: oneOf(PLATFORMS, first(params.platform)),
    pillarId: pillarId && (!knownPillarIds || knownPillarIds.includes(pillarId)) ? pillarId : null,
    status: oneOf(POST_STATUS_FILTERS, first(params.status)),
    from,
    to: from && to && to < from ? null : to,
  };
}

/** `halaman` → nomor halaman ≥ 1. Nilai tidak valid → 1. Batas atas dijaga `paginate`. */
export function parsePostPage(params: RawSearchParams): number {
  const raw = first(params.halaman)?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Filter + halaman → query string tanpa "?". Nilai kosong dan halaman 1 tidak ditulis. */
export function postFiltersToQuery(filters: PostFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.pillarId) params.set("pilar", filters.pillarId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("dari", filters.from);
  if (filters.to) params.set("sampai", filters.to);
  if (page > 1) params.set("halaman", String(page));
  return params.toString();
}

function matchesStatus(status: MetricStatus, filter: PostStatusFilter): boolean {
  return filter === "PERLU" ? isMetricDue(status) : status === filter;
}

/** Saring post, urutan dipertahankan. Tanggal memakai batas hari WIB. */
export function filterPosts<
  T extends { platform: Platform; pillar: { id: string }; status: MetricStatus; postedAt: Date },
>(posts: readonly T[], filters: PostFilters): T[] {
  const fromMs = filters.from ? wibToUtc(filters.from).getTime() : null;
  const toExclusiveMs = filters.to ? addWibDays(wibToUtc(filters.to), 1).getTime() : null;

  return posts.filter((post) => {
    if (filters.platform && post.platform !== filters.platform) return false;
    if (filters.pillarId && post.pillar.id !== filters.pillarId) return false;
    if (filters.status && !matchesStatus(post.status, filters.status)) return false;
    const postedMs = post.postedAt.getTime();
    if (fromMs !== null && postedMs < fromMs) return false;
    if (toExclusiveMs !== null && postedMs >= toExclusiveMs) return false;
    return true;
  });
}

/**
 * Pilihan filter pilar: pilar yang benar-benar dipakai post, urut nama.
 * Pilar nonaktif tetap muncul selama masih punya post.
 */
export function pillarOptions<P extends { id: string; name: string }>(
  posts: readonly { pillar: P }[],
): P[] {
  const byId = new Map(posts.map((post) => [post.pillar.id, post.pillar]));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Potong satu halaman. Halaman di luar batas dikembalikan ke halaman terdekat yang ada. */
export function paginate<T>(items: readonly T[], page: number, perPage = POSTS_PER_PAGE) {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, pageCount };
}
