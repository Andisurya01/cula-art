import { ArrowLink } from "@/components/design/arrow-link";
import { SectionLabel } from "@/components/design/section-label";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import { galleryContainer } from "../section-heading";

const copy = galleryCopy.notFound;

/** Isi halaman 404 Galeri (karya tidak ada / belum terbit / URL salah). */
export function GalleryNotFound() {
  return (
    <section aria-labelledby="judul-404" className={cn(galleryContainer, "pt-10 sm:pt-16 lg:pt-24")}>
      <div className="grid max-w-4xl gap-8">
        <SectionLabel index={copy.label} className="border-t border-border pt-4" />
        <TwoToneHeading id="judul-404" as="h1" level="h1" first={copy.titleFirst} second={copy.titleSecond} />
        <p className="max-w-prose text-body-lg text-pretty text-muted-foreground">{copy.description}</p>
        <div className="flex flex-wrap gap-2">
          <ArrowLink href={routes.gallery.catalog} size="lg">
            {copy.backToCatalog}
          </ArrowLink>
          <ArrowLink href={routes.gallery.home} variant="secondary" size="lg">
            {copy.backHome}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
