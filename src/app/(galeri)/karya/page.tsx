import type { Metadata } from "next";
import { catalogHref, parseCatalogParams } from "@/features/gallery/catalog";
import { CatalogFilterForm } from "@/features/gallery/components/catalog/catalog-filters";
import { CatalogResults } from "@/features/gallery/components/catalog/catalog-results";
import { galleryCopy } from "@/features/gallery/copy";
import { getCatalog, getCatalogYears, getGalleryProfile } from "@/features/gallery/queries";
import { absoluteUrl } from "@/lib/site";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseCatalogParams(await searchParams);
  const profile = await getGalleryProfile();
  const mediumLabel = filters.medium ? galleryCopy.medium[filters.medium] : null;
  const title = mediumLabel ? `${mediumLabel} · ${galleryCopy.meta.catalogTitle}` : galleryCopy.meta.catalogTitle;
  const description = mediumLabel
    ? galleryCopy.meta.catalogMediumDescription(mediumLabel)
    : galleryCopy.meta.catalogDescription;
  // Halaman per medium boleh diindeks; kombinasi pencarian/filter lain/halaman tidak (konten ganda).
  const canonical = catalogHref({ medium: filters.medium });
  const indexable = !filters.q && !filters.status && !filters.year && filters.page === 1 && filters.sort === "terbaru";
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: profile.siteName,
      title: `${title} · ${profile.siteName}`,
      description,
      url: absoluteUrl(canonical),
    },
  };
}

export default async function CatalogPage({ searchParams }: Props) {
  const filters = parseCatalogParams(await searchParams);
  const [{ items, total }, years] = await Promise.all([getCatalog(filters), getCatalogYears()]);
  const heading = filters.medium ? galleryCopy.medium[filters.medium] : galleryCopy.catalog.title;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-10">
      <header className="mb-8 grid max-w-2xl gap-3 sm:mb-10">
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">{heading}</h1>
        <p className="text-pretty text-muted-foreground">{galleryCopy.catalog.intro}</p>
      </header>
      <CatalogFilterForm filters={filters} years={years} total={total}>
        <CatalogResults filters={filters} items={items} total={total} />
      </CatalogFilterForm>
    </div>
  );
}
