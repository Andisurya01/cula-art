import Link from "next/link";
import {
  ARTWORK_VISIBILITIES,
  ARTWORK_VISIBILITY_LABELS,
  AVAILABILITIES,
  AVAILABILITY_LABELS,
  MEDIUMS,
  MEDIUM_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { artworkListHref, type ArtworkListFilters } from "../filters";

type FilterKey = keyof ArtworkListFilters;

/** Filter publikasi/medium/ketersediaan lewat URL (tanpa state client); tiap baris bisa digeser di HP. */
export function ArtworkFilters({ filters }: { filters: ArtworkListFilters }) {
  return (
    <div className="mb-4 grid gap-2">
      <FilterRow
        label="Publikasi"
        filterKey="visibility"
        filters={filters}
        options={ARTWORK_VISIBILITIES.map((v) => ({ value: v, label: ARTWORK_VISIBILITY_LABELS[v] }))}
      />
      <FilterRow
        label="Medium"
        filterKey="medium"
        filters={filters}
        options={MEDIUMS.map((m) => ({ value: m, label: MEDIUM_LABELS[m] }))}
      />
      <FilterRow
        label="Ketersediaan"
        filterKey="availability"
        filters={filters}
        options={AVAILABILITIES.map((a) => ({ value: a, label: AVAILABILITY_LABELS[a] }))}
      />
    </div>
  );
}

function FilterRow({
  label,
  filterKey,
  filters,
  options,
}: {
  label: string;
  filterKey: FilterKey;
  filters: ArtworkListFilters;
  options: { value: string; label: string }[];
}) {
  const active = filters[filterKey];
  const all: { value: string | null; label: string }[] = [{ value: null, label: "Semua" }, ...options];

  return (
    <nav aria-label={`Filter ${label.toLowerCase()}`} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max items-center gap-1.5">
        <li className="w-24 shrink-0 text-xs text-muted-foreground">{label}</li>
        {all.map((o) => {
          const isActive = o.value === active;
          return (
            <li key={o.label}>
              <Link
                href={artworkListHref({ ...filters, [filterKey]: o.value })}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
