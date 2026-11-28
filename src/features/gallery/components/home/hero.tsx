import Image from "next/image";
import Link from "next/link";
import { ArrowLink } from "@/components/design/arrow-link";
import { MetaLabel } from "@/components/design/section-label";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { motionIndex } from "@/components/motion/motion-utils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import type { GalleryArtworkCard, GalleryImage, GalleryProfile, GalleryStats } from "../../dto";
import { artworkMeta } from "../../format";
import { AvailabilityBadge } from "../availability-badge";
import { SocialPills } from "../profile-links";
import { galleryContainer } from "../section-heading";
import { heroHeading } from "./home-data";

/** Foto hero: ±86% kolom kanan (5/12 kontainer) di desktop, hampir selebar layar di HP. */
const HERO_SIZES = "(min-width: 1280px) 440px, (min-width: 1024px) 36vw, (min-width: 640px) 75vw, 86vw";

/** Rasio bingkai foto mengikuti cover, dibatasi 3:4 sampai 4:3 supaya hero tidak terlalu tinggi/pendek. */
function heroRatio(cover: GalleryImage): number {
  return Math.min(4 / 3, Math.max(3 / 4, cover.width / Math.max(1, cover.height)));
}

/**
 * Hero Beranda (gaya referensi Galeri): judul display dua warna (nama situs + tagline), foto karya
 * unggulan besar yang "keluar" dari bingkai kartu, tombol pil ↗, dan baris label meta
 * ("KARYA GAMBAR & CLAY · SEJAK 2024", dari karya Terbit). Foto hero = kandidat LCP (di-preload).
 * Fase 7 (CSS murni, tanpa menunggu hidrasi; diam tanpa JS / tingkat Mati / kurangi gerakan): judul
 * muncul per baris (urutan 0-1), foto tersingkap bersamaan dengan judul (urutan 0, supaya LCP tidak
 * tertunda; gambar tetap dimuat segera), lalu pengantar, tombol, dan label meta menyusul berjeda.
 */
export function HomeHero({
  profile,
  artwork,
  stats,
  showActions,
}: {
  profile: GalleryProfile;
  artwork: GalleryArtworkCard | null;
  stats: GalleryStats;
  /** Ada karya terbit: tampilkan tombol "Lihat karya" dan "Tentang". */
  showActions: boolean;
}) {
  const { second, lead } = heroHeading(profile.tagline);
  const cover = artwork?.cover ?? null;
  const withPhoto = artwork !== null && cover !== null;

  return (
    <section aria-labelledby="judul-beranda" className={cn(galleryContainer, "pt-6 sm:pt-10 lg:pt-14")}>
      <div className={cn("grid gap-10 sm:gap-12", withPhoto && "lg:grid-cols-12 lg:gap-x-10 lg:gap-y-12")}>
        <TwoToneHeading
          id="judul-beranda"
          as="h1"
          level="display"
          first={profile.siteName}
          second={second}
          reveal="load"
          className={cn("wrap-break-word", withPhoto && "lg:col-span-7 lg:row-start-1")}
        />

        {withPhoto && (
          <HeroFigure artwork={artwork} cover={cover} className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1" />
        )}

        {(lead || showActions) && (
          <div className={cn("grid content-end gap-6", withPhoto && "lg:col-span-6 lg:row-start-2")}>
            {lead && (
              <p className="max-w-md text-body-lg text-pretty text-muted-foreground motion-enter-fade" style={motionIndex(2)}>
                {lead}
              </p>
            )}
            {showActions && (
              <div className="flex flex-wrap gap-2 motion-enter" style={motionIndex(3)}>
                <ArrowLink href={routes.gallery.catalog} size="lg">
                  {galleryCopy.home.viewWorks}
                </ArrowLink>
                <ArrowLink href={routes.gallery.about} variant="secondary" size="lg">
                  {galleryCopy.home.about}
                </ArrowLink>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-4 motion-enter-fade lg:mt-16"
        style={motionIndex(4)}
      >
        <MetaLabel>{galleryCopy.home.metaLine(stats.mediums, stats.firstYear)}</MetaLabel>
        {profile.city && <MetaLabel className="hidden sm:inline">({profile.city})</MetaLabel>}
        {showActions && <MetaLabel className="hidden sm:inline">{galleryCopy.home.scrollHint}</MetaLabel>}
      </div>
    </section>
  );
}

/**
 * Foto karya unggulan di atas bingkai kartu putih; bagian atas foto menonjol keluar dari bingkai.
 * Seluruh kartu bisa diketuk lewat tautan judul yang direntangkan (satu tab stop).
 */
function HeroFigure({
  artwork,
  cover,
  className,
}: {
  artwork: GalleryArtworkCard;
  cover: GalleryImage;
  className?: string;
}) {
  const meta = artworkMeta(artwork);
  return (
    <figure className={cn("relative isolate pt-6 sm:pt-10", className)}>
      {/* Bingkai di belakang (z negatif dalam figure yang terisolasi), mulai di bawah tepi atas foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-24 bottom-0 -z-10 rounded-card bg-card ring-1 ring-border/70 motion-enter-fade sm:top-36"
      />
      {/* Foto tersingkap dari bawah (clip-path di bingkai) sambil sedikit mengecil ke ukuran asli. */}
      <div
        className="relative mx-auto w-[86%] overflow-hidden rounded-image bg-muted shadow-lg motion-enter-clip"
        style={{ aspectRatio: String(heroRatio(cover)) }}
      >
        <Image src={cover.src} alt={cover.alt} fill sizes={HERO_SIZES} preload className="object-cover motion-enter-zoom" />
      </div>
      <figcaption className="flex items-end justify-between gap-4 p-5 motion-enter-fade sm:p-6" style={motionIndex(3)}>
        <span className="grid min-w-0 gap-1">
          <span className="type-label text-muted-foreground">{galleryCopy.home.heroCaptionLabel}</span>
          <Link
            href={routes.gallery.artwork(artwork.slug)}
            className="font-heading text-h5 wrap-break-word outline-hidden after:absolute after:inset-0 after:rounded-card hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring"
          >
            {artwork.title}
          </Link>
          {meta && <span className="text-body-sm text-muted-foreground">{meta}</span>}
        </span>
        <AvailabilityBadge availability={artwork.availability} className="shrink-0" />
      </figcaption>
    </figure>
  );
}

/** Belum ada karya terbit: kartu pesan ramah + tautan sosial. */
export function HomeEmpty({ profile }: { profile: GalleryProfile }) {
  return (
    <section aria-labelledby="karya-disiapkan" className={cn(galleryContainer, "pt-16 sm:pt-20")}>
      <div className="grid max-w-2xl gap-4 rounded-card bg-card p-6 ring-1 ring-border/70 motion-enter sm:p-10">
        <h2 id="karya-disiapkan" className="font-heading text-h3">
          {galleryCopy.home.emptyTitle}
        </h2>
        <p className="text-pretty text-muted-foreground">{galleryCopy.home.emptyDescription}</p>
        <SocialPills profile={profile} className="pt-2" />
      </div>
    </section>
  );
}
