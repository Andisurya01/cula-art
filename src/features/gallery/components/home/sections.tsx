import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArrowLink } from "@/components/design/arrow-link";
import { StatPill } from "@/components/design/stat-pill";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { catalogHref } from "../../catalog";
import { galleryCopy } from "../../copy";
import type { GalleryArtworkCard, GalleryProfile, GalleryStats } from "../../dto";
import type { GalleryMediumShortcut } from "../../queries";
import { ArtworkCard, CARD_SIZES } from "../artwork-card";
import { SocialPills } from "../profile-links";
import { RevealSectionLabel, SectionHeading, gallerySection } from "../section-heading";
import { hasProfileSummary, yearsActive } from "./home-data";

const copy = galleryCopy.home;

/**
 * Sekilas: pil statistik (jumlah karya Terbit, medium, tahun berkarya) dengan gradien halus.
 * Fase 7: pil muncul saat di-scroll dan angkanya menghitung naik sekali (nilai akhir tetap di HTML,
 * format ribuan gaya Indonesia sama dengan sebelumnya).
 */
export function StatsSection({ stats, index }: { stats: GalleryStats; index?: number }) {
  if (stats.artworkCount === 0) return null;
  const years = yearsActive(stats);
  const mediumNames = stats.mediums.map((m) => galleryCopy.medium[m]).join(" · ");
  return (
    <section aria-labelledby="sekilas" className={gallerySection}>
      <SectionHeading id="sekilas" index={index} eyebrow={copy.statsLabel} title={copy.statsTitle} second={copy.statsSecond} />
      <ul className="grid grid-cols-2 items-center gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <Reveal as="li" className="col-span-2 md:col-span-1">
          <StatPill
            value={<CountUp value={stats.artworkCount} />}
            label={copy.statsCountLabel(stats.artworkCount)}
            hint={mediumNames || undefined}
          />
        </Reveal>
        {stats.mediums.length > 0 && (
          <Reveal as="li">
            <StatPill
              shape="circle"
              value={<CountUp value={stats.mediums.length} />}
              label={copy.statsMediumLabel(stats.mediums.length)}
              className="mx-auto"
            />
          </Reveal>
        )}
        {years !== null && stats.firstYear !== null && stats.lastYear !== null && (
          <Reveal as="li">
            <StatPill
              shape="circle"
              value={<CountUp value={years} />}
              label={copy.statsYearsLabel}
              hint={copy.yearsRange(stats.firstYear, stats.lastYear)}
              className="mx-auto"
            />
          </Reveal>
        )}
      </ul>
    </section>
  );
}

/** Karya unggulan: baris geser (scroll-snap) di HP, grid 3-4 kolom di layar lebar. */
export function FeaturedSection({ artworks, index }: { artworks: GalleryArtworkCard[]; index?: number }) {
  if (artworks.length === 0) return null;
  return (
    <section aria-labelledby="karya-unggulan" className={gallerySection}>
      <SectionHeading
        id="karya-unggulan"
        index={index}
        eyebrow={copy.featuredEyebrow}
        title={copy.featuredTitle}
        second={copy.featuredSecond}
        action={{ href: catalogHref({ sort: "unggulan" }), label: copy.seeAll }}
      />
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {artworks.map((artwork) => (
          <li key={artwork.slug} className="w-[72vw] max-w-80 shrink-0 snap-start md:w-auto md:max-w-none">
            <ArtworkCard artwork={artwork} sizes={CARD_SIZES.row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 6 karya terakhir yang terbit. */
export function LatestSection({ artworks, index }: { artworks: GalleryArtworkCard[]; index?: number }) {
  if (artworks.length === 0) return null;
  return (
    <section aria-labelledby="karya-terbaru" className={gallerySection}>
      <SectionHeading
        id="karya-terbaru"
        index={index}
        eyebrow={copy.latestEyebrow}
        title={copy.latestTitle}
        second={copy.latestSecond}
        action={{ href: routes.gallery.catalog, label: copy.seeAll }}
      />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14">
        {artworks.map((artwork) => (
          <li key={artwork.slug}>
            <ArtworkCard artwork={artwork} sizes={CARD_SIZES.three} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Pintasan per medium ke katalog terfilter: kartu radius besar dengan cover karya sebagai latar.
 * Fase 7: kartu muncul berjeda saat di-scroll; hover/fokus foto membesar halus dan ikon ↗ bergeser.
 */
export function MediumSection({ shortcuts, index }: { shortcuts: GalleryMediumShortcut[]; index?: number }) {
  if (shortcuts.length === 0) return null;
  const three = shortcuts.length >= 3;
  const sizes = three ? "(min-width: 1280px) 400px, (min-width: 640px) 31vw, 48vw" : "(min-width: 1280px) 600px, 48vw";
  return (
    <section aria-labelledby="pilih-medium" className={gallerySection}>
      <SectionHeading
        id="pilih-medium"
        index={index}
        eyebrow={copy.mediumEyebrow}
        title={copy.mediumTitle}
        second={copy.mediumSecond}
      />
      <ul className={cn("grid grid-cols-2 gap-4 lg:gap-6", three && "sm:grid-cols-3")}>
        {shortcuts.map(({ medium, count, cover }) => (
          <Reveal as="li" key={medium}>
            <Link
              href={catalogHref({ medium })}
              className={cn(
                "group relative flex aspect-[3/4] items-end overflow-hidden rounded-card outline-hidden focus-visible:ring-3 focus-visible:ring-ring sm:aspect-[4/3]",
                cover ? "bg-media text-media-foreground" : "bg-card text-card-foreground ring-1 ring-border/70",
              )}
            >
              {cover && (
                <Image
                  src={cover.src}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover transition-transform duration-slow ease-standard group-hover:motion-zoom group-focus-visible:motion-zoom"
                />
              )}
              <span
                className={cn(
                  "relative flex w-full items-end justify-between gap-3 p-4 sm:p-6",
                  cover && "bg-linear-to-t from-media/85 via-media/45 to-transparent pt-20",
                )}
              >
                <span className="grid min-w-0 gap-1">
                  <span className="font-heading text-h4 wrap-break-word sm:text-h3">{galleryCopy.medium[medium]}</span>
                  <span className={cn("text-body-sm", cover ? "text-media-foreground/80" : "text-muted-foreground")}>
                    {copy.mediumCount(count)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden size-10 shrink-0 items-center justify-center rounded-full sm:inline-flex",
                    cover ? "bg-media-foreground text-media" : "bg-primary text-primary-foreground",
                  )}
                >
                  <ArrowUpRight className="size-4 transition-transform duration-base ease-standard group-hover:motion-nudge group-focus-visible:motion-nudge" />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/** Profil singkat: kartu putih berisi foto, nama, bio, tautan sosial, dan tautan ke Tentang (muncul saat di-scroll). */
export function ProfileSection({ profile, index }: { profile: GalleryProfile; index?: number }) {
  if (!hasProfileSummary(profile)) return null;
  return (
    <section aria-labelledby="profil-singkat" className={gallerySection}>
      <RevealSectionLabel index={index} className="mb-10 border-t border-border pt-4 sm:mb-12">
        {copy.profileEyebrow}
      </RevealSectionLabel>
      <Reveal className="grid gap-8 rounded-card bg-card p-6 ring-1 ring-border/70 sm:p-10 md:grid-cols-[auto_1fr] md:items-start md:gap-12 lg:p-14">
        {profile.avatarSrc && (
          <div className="relative size-28 overflow-hidden rounded-full bg-muted sm:size-40">
            <Image src={profile.avatarSrc} alt={profile.siteName} fill sizes="160px" className="object-cover" />
          </div>
        )}
        <div className="grid gap-5">
          <h2 id="profil-singkat" className="font-heading text-h2 wrap-break-word">
            {profile.siteName}
          </h2>
          {profile.bio && (
            <p className="max-w-prose text-body-lg whitespace-pre-line text-pretty text-muted-foreground">{profile.bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ArrowLink href={routes.gallery.about} size="lg">
              {copy.profileMore}
            </ArrowLink>
            <SocialPills profile={profile} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
