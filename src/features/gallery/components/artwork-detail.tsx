// KONTRAK (sesi utama, Fase 2): tampilan detail karya Galeri. Dipakai halaman /karya/[slug] dan
// pratinjau Studio /studio/karya/[id]/pratinjau. Tanda tangan props jangan diubah tanpa menyesuaikan
// pratinjau. Komponen ini tidak memanggil query (aman dirender di Galeri maupun Studio).

import Image from "next/image";
import Link from "next/link";
import { ImageOff, Mail, MessageCircle } from "lucide-react";
import type { Availability } from "@prisma/client";
import { ArrowLink } from "@/components/design/arrow-link";
import { motionIndex } from "@/components/motion/motion-utils";
import { Reveal } from "@/components/motion/reveal";
import { RevealLines } from "@/components/motion/reveal-lines";
import { artworkPhotoTransitionName } from "@/components/motion/view-transitions";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { catalogHref } from "../catalog";
import { galleryCopy } from "../copy";
import type { GalleryArtworkCard, GalleryArtworkDetail, GalleryProcessLink, GalleryProfile } from "../dto";
import { artworkMeta, formatDimensions, inquiryLink, paragraphs, priceLabel } from "../format";
import { ArtworkCard, CARD_SIZES } from "./artwork-card";
import { AvailabilityBadge } from "./availability-badge";
import { CopyLinkButton } from "./copy-link-button";
import { numberSections } from "./home/home-data";
import { InstagramIcon, TikTokIcon } from "./layout/social-icons";
import { PhotoGallery, PhotoGrid } from "./photo-gallery";
import { RevealSectionLabel, SectionHeading, galleryContainer, gallerySection } from "./section-heading";

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

const copy = galleryCopy.detail;

function statusNote(availability: Availability): string | null {
  if (availability === "NOT_FOR_SALE" || availability === "SOLD") return copy.statusNote[availability];
  return null;
}

/**
 * Fase 7: foto utama = elemen bersama dari kartu katalog (A8, foto tidak ikut animasi masuk supaya
 * tidak bertabrakan dengan transisi); panel info masuk berjeda (CSS murni saat halaman tampil);
 * bagian bernomor (cerita, proses, karya lain) muncul saat di-scroll.
 */
export function ArtworkDetailView({ artwork, profile, url, related, preview = false }: ArtworkDetailViewProps) {
  const story = paragraphs(artwork.description);
  const hasProcess = artwork.processImages.length > 0 || artwork.processLinks.length > 0;
  const mediumLabel = artwork.medium ? galleryCopy.medium[artwork.medium] : null;
  const allSpecs: { label: string; value: string | null }[] = [
    { label: copy.specs.medium, value: mediumLabel },
    { label: copy.specs.dimensions, value: formatDimensions(artwork) },
    { label: copy.specs.materials, value: artwork.materials?.trim() || null },
    { label: copy.specs.year, value: artwork.year ? String(artwork.year) : null },
  ];
  const specs = allSpecs.filter((spec): spec is { label: string; value: string } => !!spec.value);
  // Nomor "(01)" hanya untuk bagian yang tampil.
  const index = numberSections({ story: story.length > 0, process: hasProcess, related: related.length > 0 });

  return (
    <article className="pb-4">
      <div className={cn(galleryContainer, "pt-4 sm:pt-6 lg:grid lg:grid-cols-12 lg:gap-12 lg:pt-10 xl:gap-16")}>
        <div className="lg:col-span-7">
          <PhotoGallery
            images={artwork.images}
            title={artwork.title}
            transitionName={artworkPhotoTransitionName(artwork.slug)}
          />
        </div>

        <div className="pt-8 lg:col-span-5 lg:pt-0">
          <div className="grid gap-6 lg:sticky lg:top-28">
            <nav aria-label={copy.breadcrumb} className="motion-enter">
              <ol className="flex flex-wrap items-center gap-x-2 text-body-sm text-muted-foreground">
                <li>
                  <Link
                    href={routes.gallery.catalog}
                    className="inline-flex min-h-11 items-center rounded-button outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    {galleryCopy.nav.catalog}
                  </Link>
                </li>
                {artwork.medium && mediumLabel && (
                  <>
                    <li aria-hidden="true">/</li>
                    <li>
                      <Link
                        href={catalogHref({ medium: artwork.medium })}
                        className="inline-flex min-h-11 items-center rounded-button outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
                      >
                        {mediumLabel}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <header className="-mt-3 grid gap-4 motion-enter" style={motionIndex(1)}>
              <h1 className="font-heading text-h2 text-balance wrap-break-word">{artwork.title}</h1>
              {artwork.summary && <p className="text-body-lg text-pretty text-muted-foreground">{artwork.summary}</p>}
            </header>

            <InfoCard artwork={artwork} profile={profile} url={url} preview={preview} />

            {specs.length > 0 && (
              <dl className="divide-y divide-border border-y border-border motion-enter" style={motionIndex(3)}>
                {specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-[7rem_1fr] gap-4 py-3.5 text-body-sm">
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd className="min-w-0 wrap-break-word">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {story.length > 0 && (
        <section aria-labelledby="cerita-karya" className={gallerySection}>
          <RevealSectionLabel index={index.story} className="mb-10 border-t border-border pt-4 sm:mb-12">
            {copy.storyEyebrow}
          </RevealSectionLabel>
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
            <RevealLines
              as="h2"
              id="cerita-karya"
              trigger="scroll"
              lines={[{ content: copy.storyTitle }]}
              className="font-heading text-h2 lg:col-span-4"
            />
            <Reveal className="grid max-w-prose gap-5 text-body-lg text-pretty lg:col-span-8">
              {story.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {hasProcess && (
        <section aria-labelledby="proses-karya" className={gallerySection}>
          <RevealSectionLabel index={index.process} className="mb-10 border-t border-border pt-4 sm:mb-12">
            {copy.processEyebrow}
          </RevealSectionLabel>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="grid content-start gap-4 lg:col-span-4">
              <RevealLines
                as="h2"
                id="proses-karya"
                trigger="scroll"
                lines={[{ content: copy.processTitle }]}
                className="font-heading text-h2"
              />
              <Reveal className="grid gap-4">
                {artwork.processImages.length > 0 && <p className="text-muted-foreground">{copy.processIntro}</p>}
                <ProcessLinks links={artwork.processLinks} />
              </Reveal>
            </div>
            {artwork.processImages.length > 0 && (
              <div className="lg:col-span-8">
                <PhotoGrid images={artwork.processImages} title={`${copy.processTitle}: ${artwork.title}`} />
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="karya-lain" className={gallerySection}>
          <SectionHeading
            id="karya-lain"
            index={index.related}
            eyebrow={copy.relatedEyebrow}
            title={copy.relatedTitle}
            action={
              artwork.medium && mediumLabel
                ? { href: catalogHref({ medium: artwork.medium }), label: copy.relatedMore(mediumLabel) }
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

/**
 * Kartu info gaya "Proof of life" (referensi Galeri): thumbnail bulat, harga atau status, meta,
 * pil "↗ Tanya karya ini" (WhatsApp, cadangan email; disembunyikan jika keduanya kosong) + pil
 * "Bagikan" (salin tautan), baris kanal kontak + ketersediaan, dan catatan kecil.
 */
function InfoCard({
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
  const price = priceLabel(artwork);
  const dimensions = formatDimensions(artwork);
  const meta = [artworkMeta(artwork), dimensions].filter(Boolean).join(" · ");
  const inquiry = inquiryLink(profile, { title: artwork.title, url });
  const showInquiry = preview || inquiry !== null;
  const ChannelIcon = inquiry?.kind === "email" ? Mail : MessageCircle;
  const note = preview ? (inquiry ? copy.previewDisabled : copy.previewNoContact) : inquiry ? copy.inquiryNote : null;

  return (
    <section
      aria-label={copy.infoLabel}
      className="grid gap-4 rounded-card bg-card p-4 text-card-foreground ring-1 ring-border/70 motion-enter sm:p-5"
      style={motionIndex(2)}
    >
      <div className="flex items-center gap-4">
        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
          {artwork.cover ? (
            <Image src={artwork.cover.src} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ImageOff className="size-5" aria-hidden="true" />
          )}
        </div>
        <div className="grid min-w-0 gap-1">
          {price ? (
            <p className="font-heading text-h4">{price}</p>
          ) : (
            <p className="font-heading text-h6">{statusNote(artwork.availability)}</p>
          )}
          {meta && <p className="text-body-sm text-muted-foreground">{meta}</p>}
        </div>
      </div>

      <div className={cn("grid gap-2", showInquiry && "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
        {preview ? (
          <Button type="button" size="lg" arrow="start" disabled>
            {galleryCopy.inquiry.button}
          </Button>
        ) : (
          inquiry && (
            <Button asChild size="lg" arrow="start">
              <a href={inquiry.href} {...(inquiry.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {galleryCopy.inquiry.button}
              </a>
            </Button>
          )
        )}
        <CopyLinkButton url={url} disabled={preview} />
      </div>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card-nested bg-muted px-4 py-2">
        {inquiry ? (
          <span className="inline-flex items-center gap-2 text-body-sm">
            <ChannelIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {copy.inquiryVia[inquiry.kind]}
          </span>
        ) : (
          <span className="text-body-sm text-muted-foreground">{galleryCopy.catalog.statusLabel}</span>
        )}
        <AvailabilityBadge availability={artwork.availability} />
      </div>

      {note && <p className="text-center text-caption text-muted-foreground">{note}</p>}
    </section>
  );
}

function ProcessLinks({ links }: { links: GalleryProcessLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.platform === "TIKTOK" ? TikTokIcon : InstagramIcon;
        return (
          <li key={link.url}>
            <ArrowLink href={link.url} external variant="secondary" size="lg">
              <Icon className="size-4" />
              {copy.watchProcess(PLATFORM_LABELS[link.platform])}
            </ArrowLink>
          </li>
        );
      })}
    </ul>
  );
}
