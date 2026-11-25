import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATALOG_MAX_PAGE, catalogHref, hasActiveFilters, type CatalogFilters } from "../../catalog";
import { galleryCopy } from "../../copy";
import type { GalleryArtworkCard } from "../../dto";
import { ArtworkCard, CARD_SIZES } from "../artwork-card";
import { LoadMoreLink } from "./load-more";

const copy = galleryCopy.catalog;

/** Grid katalog (2 / 3 / 4 kolom), "Muat lagi", atau empty state. Judul kartu = h2 (di bawah h1 "Karya"). */
export function CatalogResults({
  filters,
  items,
  total,
}: {
  filters: CatalogFilters;
  items: GalleryArtworkCard[];
  total: number;
}) {
  if (items.length === 0) {
    const filtered = hasActiveFilters(filters);
    return (
      <div className="grid justify-items-start gap-4 rounded-card bg-card px-6 py-12 ring-1 ring-border/70 sm:px-10 sm:py-16">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <p className="font-heading text-h3">{filtered ? copy.emptyFilteredTitle : copy.emptyTitle}</p>
        <p className="max-w-prose text-pretty text-muted-foreground">
          {filtered ? copy.emptyFilteredDescription : copy.emptyDescription}
        </p>
        {filtered && (
          <Link
            href={catalogHref({ sort: filters.sort })}
            scroll={false}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-2")}
          >
            {copy.clearFilters}
          </Link>
        )}
      </div>
    );
  }

  const hasMore = items.length < total && filters.page < CATALOG_MAX_PAGE;
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
        {items.map((artwork, i) => (
          <li key={artwork.slug}>
            <ArtworkCard
              artwork={artwork}
              sizes={CARD_SIZES.catalog}
              headingLevel="h2"
              // Baris pertama di HP/desktop langsung dimuat; kartu pertama kandidat LCP.
              loading={i === 0 ? "high" : i < 4 ? "eager" : "lazy"}
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="mt-16 grid justify-items-center gap-3 text-center">
          <p className="text-body-sm text-muted-foreground">{copy.showing(items.length, total)}</p>
          <LoadMoreLink href={catalogHref({ ...filters, page: filters.page + 1 })} />
        </div>
      )}
    </>
  );
}
