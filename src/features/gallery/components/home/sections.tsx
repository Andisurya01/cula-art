import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { catalogHref } from "../../catalog";
import { galleryCopy } from "../../copy";
import type { GalleryArtworkCard, GalleryProfile } from "../../dto";
import type { GalleryMediumShortcut } from "../../queries";
import { ArtworkCard, CARD_SIZES } from "../artwork-card";
import { SocialPills } from "../profile-links";
import { ArrowLink, Eyebrow, SectionHeading } from "../section-heading";

const section = "mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-10 lg:pt-28";

/** Karya unggulan: baris geser (scroll-snap) di HP, grid 3-4 kolom di layar lebar. */
export function FeaturedSection({ artworks }: { artworks: GalleryArtworkCard[] }) {
  if (artworks.length === 0) return null;
  return (
    <section aria-labelledby="karya-unggulan" className={section}>
      <SectionHeading
        id="karya-unggulan"
        eyebrow={galleryCopy.home.featuredEyebrow}
        title={galleryCopy.home.featuredTitle}
        action={{ href: catalogHref({ sort: "unggulan" }), label: galleryCopy.home.seeAll }}
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
export function LatestSection({ artworks }: { artworks: GalleryArtworkCard[] }) {
  if (artworks.length === 0) return null;
  return (
    <section aria-labelledby="karya-terbaru" className={section}>
      <SectionHeading
        id="karya-terbaru"
        eyebrow={galleryCopy.home.latestEyebrow}
        title={galleryCopy.home.latestTitle}
        action={{ href: routes.gallery.catalog, label: galleryCopy.home.seeAll }}
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

/** Pintasan per medium ke katalog terfilter, dengan cover karya sebagai latar. */
export function MediumSection({ shortcuts }: { shortcuts: GalleryMediumShortcut[] }) {
  if (shortcuts.length === 0) return null;
  const three = shortcuts.length >= 3;
  const sizes = three ? "(min-width: 1280px) 400px, (min-width: 640px) 31vw, 48vw" : "(min-width: 1280px) 600px, 48vw";
  return (
    <section aria-labelledby="pilih-medium" className={section}>
      <SectionHeading id="pilih-medium" eyebrow={galleryCopy.home.mediumEyebrow} title={galleryCopy.home.mediumTitle} />
      <ul className={cn("grid grid-cols-2 gap-4 lg:gap-6", three && "sm:grid-cols-3")}>
        {shortcuts.map(({ medium, count, cover }) => (
          <li key={medium}>
            <Link
              href={catalogHref({ medium })}
              className="group relative flex aspect-[3/4] items-end overflow-hidden rounded-sm bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:aspect-[4/3]"
            >
              {cover && (
                <Image
                  src={cover.src}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                />
              )}
              <span
                className={cn(
                  "relative grid w-full gap-1 p-4 sm:p-6",
                  cover ? "bg-linear-to-t from-black/80 via-black/45 to-transparent pt-20 text-white" : "text-foreground",
                )}
              >
                <span className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
                  {galleryCopy.medium[medium]}
                </span>
                <span className={cn("inline-flex items-center gap-1.5 text-sm", cover ? "text-white/90" : "text-muted-foreground")}>
                  {galleryCopy.home.mediumCount(count)}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ringkasan profil: foto, bio, tautan sosial, tautan ke Tentang. */
export function ProfileSection({ profile }: { profile: GalleryProfile }) {
  if (!profile.avatarSrc && !profile.bio && !profile.instagramUrl && !profile.tiktokUrl) return null;
  return (
    <section aria-labelledby="profil-singkat" className={section}>
      <div className="grid gap-8 border-t border-border pt-12 md:grid-cols-[auto_1fr] md:items-start md:gap-12">
        {profile.avatarSrc && (
          <div className="relative size-28 overflow-hidden rounded-full bg-muted sm:size-36">
            <Image src={profile.avatarSrc} alt={profile.siteName} fill sizes="144px" className="object-cover" />
          </div>
        )}
        <div className="grid gap-4">
          <Eyebrow>{galleryCopy.home.profileEyebrow}</Eyebrow>
          <h2 id="profil-singkat" className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {profile.siteName}
          </h2>
          {profile.bio && (
            <p className="max-w-prose text-lg whitespace-pre-line text-pretty text-muted-foreground">{profile.bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <SocialPills profile={profile} />
            <ArrowLink href={routes.gallery.about}>{galleryCopy.home.profileMore}</ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
