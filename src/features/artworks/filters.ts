// Filter daftar karya Studio di URL (fungsi murni): ?publikasi=DRAFT&medium=CLAY&ketersediaan=AVAILABLE

import type { ArtworkVisibility, Availability, Medium } from "@prisma/client";
import { ARTWORK_VISIBILITIES, AVAILABILITIES, MEDIUMS } from "@/lib/labels";
import { routes } from "@/lib/routes";

export type ArtworkListFilters = {
  visibility: ArtworkVisibility | null;
  medium: Medium | null;
  availability: Availability | null;
};

export const ARTWORK_FILTER_PARAMS = {
  visibility: "publikasi",
  medium: "medium",
  availability: "ketersediaan",
} as const satisfies Record<keyof ArtworkListFilters, string>;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(options: readonly T[], value: string | undefined): T | null {
  return options.find((o) => o === value) ?? null;
}

export function parseArtworkFilters(params: SearchParams): ArtworkListFilters {
  return {
    visibility: pick(ARTWORK_VISIBILITIES, first(params[ARTWORK_FILTER_PARAMS.visibility])),
    medium: pick(MEDIUMS, first(params[ARTWORK_FILTER_PARAMS.medium])),
    availability: pick(AVAILABILITIES, first(params[ARTWORK_FILTER_PARAMS.availability])),
  };
}

export function hasActiveFilter(filters: ArtworkListFilters): boolean {
  return !!(filters.visibility || filters.medium || filters.availability);
}

/** URL daftar karya untuk filter tertentu; filter kosong tidak ditulis. */
export function artworkListHref(filters: ArtworkListFilters): string {
  const search = new URLSearchParams();
  if (filters.visibility) search.set(ARTWORK_FILTER_PARAMS.visibility, filters.visibility);
  if (filters.medium) search.set(ARTWORK_FILTER_PARAMS.medium, filters.medium);
  if (filters.availability) search.set(ARTWORK_FILTER_PARAMS.availability, filters.availability);
  const query = search.toString();
  return query ? `${routes.studio.artworks}?${query}` : routes.studio.artworks;
}
