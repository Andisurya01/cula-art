// Filter Analitik di search params URL: `platform`, `rentang`, `medium`.
// Murni: parser dipakai server, `update` di filter client memakai parser yang sama.

import type { Medium, Platform } from "@prisma/client";
import { MEDIUMS, PLATFORMS } from "@/lib/labels";
import { routes } from "@/lib/routes";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type AnalyticsFilters = {
  /** D1: selalu satu platform, tanpa pilihan "Semua". */
  platform: Platform;
  days: AnalyticsRange;
  /** D6: `null` = semua medium, termasuk konten tanpa medium. */
  medium: Medium | null;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  platform: "TIKTOK",
  days: 30,
  medium: null,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Search params → filter. Nilai tidak dikenal jatuh ke default. */
export function parseAnalyticsFilters(params: RawSearchParams): AnalyticsFilters {
  const platform = first(params.platform);
  const range = first(params.rentang);
  const medium = first(params.medium);
  return {
    platform: PLATFORMS.find((p) => p === platform) ?? DEFAULT_ANALYTICS_FILTERS.platform,
    days: ANALYTICS_RANGES.find((d) => String(d) === range) ?? DEFAULT_ANALYTICS_FILTERS.days,
    medium: MEDIUMS.find((m) => m === medium) ?? DEFAULT_ANALYTICS_FILTERS.medium,
  };
}

/** Filter → query string (nilai default tidak ditulis). Tanpa "?" di depan. */
export function analyticsFiltersToQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.platform !== DEFAULT_ANALYTICS_FILTERS.platform) params.set("platform", filters.platform);
  if (filters.days !== DEFAULT_ANALYTICS_FILTERS.days) params.set("rentang", String(filters.days));
  if (filters.medium) params.set("medium", filters.medium);
  return params.toString();
}

export function analyticsHref(filters: AnalyticsFilters): string {
  const query = analyticsFiltersToQuery(filters);
  return query ? `${routes.studio.analytics}?${query}` : routes.studio.analytics;
}
