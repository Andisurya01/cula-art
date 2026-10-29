import type { Metadata } from "next";
import { cache } from "react";
import { galleryCopy } from "@/features/gallery/copy";
import { metaDescription } from "@/features/gallery/format";
import { HomeEmpty, HomeHero } from "@/features/gallery/components/home/hero";
import {
  FeaturedSection,
  LatestSection,
  MediumSection,
  ProfileSection,
} from "@/features/gallery/components/home/sections";
import {
  getFeaturedArtworks,
  getGalleryProfile,
  getLatestArtworks,
  getMediumShortcuts,
} from "@/features/gallery/queries";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

/** Unggulan maks. 8 di grid + 1 untuk hero. */
const FEATURED_LIMIT = 9;

// cache: generateMetadata dan halaman memakai data yang sama dalam satu render.
const loadHome = cache(async () => {
  const [profile, featured, latest, shortcuts] = await Promise.all([
    getGalleryProfile(),
    getFeaturedArtworks(FEATURED_LIMIT),
    getLatestArtworks(6),
    getMediumShortcuts(),
  ]);
  // Hero: unggulan pertama yang punya foto; tanpa unggulan → karya terbaru.
  const hero = featured.find((a) => a.cover) ?? latest.find((a) => a.cover) ?? null;
  const featuredGrid = featured.filter((a) => a.slug !== hero?.slug).slice(0, 8);
  return { profile, hero, featuredGrid, latest, shortcuts };
});

export async function generateMetadata(): Promise<Metadata> {
  const { profile, hero } = await loadHome();
  const description =
    metaDescription(profile.tagline) ?? metaDescription(profile.bio) ?? galleryCopy.meta.defaultDescription;
  // og:image dari ../opengraph-image.ts (cover unggulan sebagai JPEG 1200×630).
  const hasImage = !!hero?.cover;
  return {
    title: {
      absolute:
        profile.tagline && profile.tagline.length <= 60 ? `${profile.siteName} · ${profile.tagline}` : profile.siteName,
    },
    description,
    alternates: { canonical: routes.gallery.home },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: profile.siteName,
      title: profile.siteName,
      description,
      url: absoluteUrl(routes.gallery.home),
    },
    twitter: {
      card: hasImage ? "summary_large_image" : "summary",
      title: profile.siteName,
      description,
    },
  };
}

export default async function GaleriHomePage() {
  const { profile, hero, featuredGrid, latest, shortcuts } = await loadHome();
  return (
    <>
      <HomeHero profile={profile} artwork={hero} />
      {latest.length === 0 ? (
        <HomeEmpty profile={profile} />
      ) : (
        <>
          <FeaturedSection artworks={featuredGrid} />
          <LatestSection artworks={latest} />
          <MediumSection shortcuts={shortcuts} />
        </>
      )}
      <ProfileSection profile={profile} />
    </>
  );
}
