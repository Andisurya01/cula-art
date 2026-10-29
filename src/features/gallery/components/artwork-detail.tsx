// KONTRAK (sesi utama, Fase 2): tampilan detail karya Galeri. Dipakai halaman /karya/[slug] dan
// pratinjau Studio /studio/karya/[id]/pratinjau. Tanda tangan props jangan diubah tanpa menyesuaikan
// pratinjau. Komponen ini tidak memanggil query (aman dirender di Galeri maupun Studio).

import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import type { Availability } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { catalogHref } from "../catalog";
import { galleryCopy } from "../copy";
import type { GalleryArtworkCard, GalleryArtworkDetail, GalleryProcessLink, GalleryProfile } from "../dto";
import { formatDimensions, inquiryLink, paragraphs, priceLabel } from "../format";
import { ArtworkCard, CARD_SIZES } from "./artwork-card";
import { AvailabilityBadge } from "./availability-badge";
import { CopyLinkButton } from "./copy-link-button";
import { InstagramIcon, TikTokIcon } from "./layout/social-icons";
import { PhotoGallery, PhotoGrid } from "./photo-gallery";
import { SectionHeading, pillLinkClass } from "./section-heading";

export type ArtworkDetailViewProps = {
  artwork: GalleryArtworkDetail;
  profile: GalleryProfile;
  /** URL absolut karya (untuk pesan WhatsApp dan salin tautan). */
  url: string;
  /** "Karya lain" dengan medium sama; kosong di pratinjau. */
  related: GalleryArtworkCard[];
  /** true di pratinjau Studio: tombol kontak/bagikan dinonaktifkan. */
  preview?: boolean;
};

const container = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-10";

function statusNote(availability: Availability): string | null {
  if (availability === "NOT_FOR_SALE" || availability === "SOLD") return galleryCopy.detail.statusNote[availability];
  return null;
}

export function ArtworkDetailView({ artwork, profile, url, related, preview = false }: ArtworkDetailViewProps) {
  const price = priceLabel(artwork);
  const story = paragraphs(artwork.description);
  const hasProcess = artwork.processImages.length > 0 || artwork.processLinks.length > 0;
  const mediumLabel = artwork.medium ? galleryCopy.medium[artwork.medium] : null;
  const allSpecs: { label: string; value: string | null }[] = [
    { label: galleryCopy.detail.specs.medium, value: mediumLabel },
    { label: galleryCopy.detail.specs.dimensions, value: formatDimensions(artwork) },
    { label: galleryCopy.detail.specs.materials, value: artwork.materials?.trim() || null },
    { label: galleryCopy.detail.specs.year, value: artwork.year ? String(artwork.year) : null },
  ];
  const specs = allSpecs.filter((spec): spec is { label: string; value: string } => !!spec.value);

  return (
    <article className="pb-4">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pt-10 xl:gap-16">
        <div className="lg:col-span-7">
          <PhotoGallery images={artwork.images} title={artwork.title} />
        </div>

        <div className="px-4 pt-8 sm:px-6 lg:col-span-5 lg:px-0 lg:pt-2">
          <div className="grid gap-7 lg:sticky lg:top-24">
            <nav aria-label={galleryCopy.detail.breadcrumb}>
              <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <li>
                  <Link href={routes.gallery.catalog} className="inline-flex min-h-11 items-center hover:text-foreground">
                    {galleryCopy.nav.catalog}
                  </Link>
                </li>
                {artwork.medium && mediumLabel && (
                  <>
                    <li aria-hidden="true">/</li>
                    <li>
                      <Link
                        href={catalogHref({ medium: artwork.medium })}
                        className="inline-flex min-h-11 items-center hover:text-foreground"
                      >
                        {mediumLabel}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <header className="-mt-4 grid gap-4">
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
                {artwork.title}
              </h1>
              {artwork.summary && <p className="text-lg text-pretty text-muted-foreground">{artwork.summary}</p>}
            </header>

            <div className="grid gap-3">
              <AvailabilityBadge availability={artwork.availability} />
              {price ? (
                <p className="text-2xl font-medium tracking-tight">{price}</p>
              ) : (
                <p className="text-muted-foreground">{statusNote(artwork.availability)}</p>
              )}
            </div>

            <ContactActions artwork={artwork} profile={profile} url={url} preview={preview} />

            {specs.length > 0 && (
              <dl className="divide-y divide-border border-y border-border">
                {specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-[7rem_1fr] gap-4 py-3.5 text-sm">
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {story.length > 0 && (
        <section aria-labelledby="cerita-karya" className={`${container} pt-20 lg:pt-28`}>
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
            <h2 id="cerita-karya" className="font-display text-3xl tracking-tight sm:text-4xl lg:col-span-4">
              {galleryCopy.detail.storyTitle}
            </h2>
            <div className="grid max-w-prose gap-5 text-lg leading-relaxed text-pretty lg:col-span-8">
              {story.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasProcess && (
        <section aria-labelledby="proses-karya" className={`${container} pt-20 lg:pt-28`}>
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
            <div className="grid content-start gap-3 lg:col-span-4">
              <h2 id="proses-karya" className="font-display text-3xl tracking-tight sm:text-4xl">
                {galleryCopy.detail.processTitle}
              </h2>
              {artwork.processImages.length > 0 && (
                <p className="text-muted-foreground">{galleryCopy.detail.processIntro}</p>
              )}
              <ProcessLinks links={artwork.processLinks} />
            </div>
            {artwork.processImages.length > 0 && (
              <div className="lg:col-span-8">
                <PhotoGrid images={artwork.processImages} title={`${galleryCopy.detail.processTitle}: ${artwork.title}`} />
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="karya-lain" className={`${container} pt-20 lg:pt-28`}>
          <SectionHeading
            id="karya-lain"
            title={galleryCopy.detail.relatedTitle}
            action={
              artwork.medium && mediumLabel
                ? { href: catalogHref({ medium: artwork.medium }), label: galleryCopy.detail.relatedMore(mediumLabel) }
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {related.map((card) => (
              <ArtworkCard key={card.slug} artwork={card} sizes={CARD_SIZES.four} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

/** "Tanya karya ini" (WhatsApp, cadangan email; disembunyikan jika keduanya kosong) + salin tautan. */
function ContactActions({
  artwork,
  profile,
  url,
  preview,
}: {
  artwork: GalleryArtworkDetail;
  profile: GalleryProfile;
  url: string;
  preview: boolean;
}) {
  const inquiry = inquiryLink(profile, { title: artwork.title, url });
  const Icon = inquiry?.kind === "email" ? Mail : MessageCircle;
  const label = (
    <>
      <Icon className="size-4" aria-hidden="true" />
      {galleryCopy.inquiry.button}
    </>
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        {preview ? (
          <button type="button" disabled className={pillLinkClass("primary", "disabled:opacity-50")}>
            {label}
          </button>
        ) : (
          inquiry && (
            <a
              href={inquiry.href}
              {...(inquiry.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={pillLinkClass("primary")}
            >
              {label}
            </a>
          )
        )}
        <CopyLinkButton url={url} disabled={preview} />
      </div>
      {preview ? (
        <p className="text-xs text-muted-foreground">
          {inquiry ? galleryCopy.detail.previewDisabled : galleryCopy.detail.previewNoContact}
        </p>
      ) : (
        inquiry && <p className="text-xs text-muted-foreground">{galleryCopy.detail.inquiryVia[inquiry.kind]}</p>
      )}
    </div>
  );
}

function ProcessLinks({ links }: { links: GalleryProcessLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-2 grid gap-2">
      {links.map((link) => {
        const Icon = link.platform === "TIKTOK" ? TikTokIcon : InstagramIcon;
        return (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-3 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Icon className="size-4" />
              {galleryCopy.detail.watchProcess(PLATFORM_LABELS[link.platform])}
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
