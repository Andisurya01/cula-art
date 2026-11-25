import type { Metadata } from "next";
import { catalogHref, parseCatalogParams } from "@/features/gallery/catalog";
import { CatalogFilterForm } from "@/features/gallery/components/catalog/catalog-filters";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { CatalogResults } from "@/features/gallery/components/catalog/catalog-results";
import { galleryContainer } from "@/features/gallery/components/section-heading";
import { galleryCopy } from "@/features/gallery/copy";
import { cn } from "@/lib/utils";
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
    <div className={cn(galleryContainer, "pt-8 sm:pt-12 lg:pt-16")}>
      <header className="mb-10 grid gap-6 sm:mb-12 lg:grid-cols-12 lg:items-end lg:gap-10">
        <TwoToneHeading
          as="h1"
          level="h1"
          first={heading}
          second={galleryCopy.catalog.titleSecond}
          className="wrap-break-word lg:col-span-8"
        />
        <p className="max-w-md text-body-lg text-pretty text-muted-foreground lg:col-span-4 lg:justify-self-end">
          {galleryCopy.catalog.intro}
        </p>
      </header>
      <CatalogFilterForm filters={filters} years={years} total={total}>
        <CatalogResults filters={filters} items={items} total={total} />
      </CatalogFilterForm>
    </div>
  );
}
