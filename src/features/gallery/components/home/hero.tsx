import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { galleryCopy } from "../../copy";
import type { GalleryArtworkCard, GalleryProfile } from "../../dto";
import { artworkMeta } from "../../format";
import { SocialPills } from "../profile-links";
import { Eyebrow, pillLinkClass } from "../section-heading";

/** Foto hero: penuh di HP, ±7/12 kontainer di desktop. */
const HERO_SIZES = "(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 100vw";

function HeroText({ profile, withActions }: { profile: GalleryProfile; withActions: boolean }) {
  return (
    <div className="grid content-center gap-6">
      <Eyebrow>{profile.city ? galleryCopy.home.eyebrowCity(profile.city) : galleryCopy.home.eyebrow}</Eyebrow>
      <h1 className="font-display text-5xl leading-[0.98] tracking-tight text-balance sm:text-6xl xl:text-7xl">
        {profile.siteName}
      </h1>
      {profile.tagline && <p className="max-w-md text-lg text-pretty text-muted-foreground">{profile.tagline}</p>}
      {withActions && (
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href={routes.gallery.catalog} className={pillLinkClass("primary")}>
            {galleryCopy.home.viewWorks}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href={routes.gallery.about} className={pillLinkClass("secondary")}>
            {galleryCopy.home.about}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Hero Beranda: nama situs, tagline, tombol "Lihat karya", dan satu karya unggulan berfoto besar (LCP, di-preload). */
export function HomeHero({ profile, artwork }: { profile: GalleryProfile; artwork: GalleryArtworkCard | null }) {
  const cover = artwork?.cover;
  if (!artwork || !cover) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-4 sm:px-6 sm:pt-20 lg:px-10">
        <HeroText profile={profile} withActions={false} />
      </section>
    );
  }

  const meta = artworkMeta(artwork);
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-10 lg:pt-16">
      <div className="lg:col-span-5">
        <HeroText profile={profile} withActions />
      </div>
      <figure className="-mx-4 grid gap-3 sm:mx-0 lg:col-span-7">
        <Link href={routes.gallery.artwork(artwork.slug)} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="relative max-h-[78svh] w-full" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}>
            <Image src={cover.src} alt={cover.alt} fill sizes={HERO_SIZES} preload className="object-contain" />
          </div>
        </Link>
        <figcaption className="px-4 text-sm text-muted-foreground sm:px-0 lg:text-right">
          <span className="sr-only">{galleryCopy.home.heroCaptionLabel}: </span>
          <Link href={routes.gallery.artwork(artwork.slug)} className="font-medium text-foreground hover:underline">
            {artwork.title}
          </Link>
          {meta && <span> · {meta}</span>}
        </figcaption>
      </figure>
    </section>
  );
}

/** Belum ada karya terbit: pesan ramah + tautan sosial. */
export function HomeEmpty({ profile }: { profile: GalleryProfile }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-10">
      <div className="grid max-w-2xl gap-4 rounded-sm border border-dashed border-border p-6 sm:p-10">
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{galleryCopy.home.emptyTitle}</h2>
        <p className="text-pretty text-muted-foreground">{galleryCopy.home.emptyDescription}</p>
        <SocialPills profile={profile} />
      </div>
    </section>
  );
}
