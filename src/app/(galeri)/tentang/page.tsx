import type { Metadata } from "next";
import { AboutView } from "@/features/gallery/components/about-view";
import { galleryCopy } from "@/features/gallery/copy";
import { metaDescription } from "@/features/gallery/format";
import { getGalleryProfile } from "@/features/gallery/queries";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getGalleryProfile();
  const description =
    metaDescription(profile.bio) ??
    metaDescription(profile.aboutText) ??
    galleryCopy.meta.aboutDescription(profile.siteName);
  return {
    title: galleryCopy.meta.aboutTitle,
    description,
    alternates: { canonical: routes.gallery.about },
    openGraph: {
      type: "profile",
      locale: "id_ID",
      siteName: profile.siteName,
      title: `${galleryCopy.meta.aboutTitle} · ${profile.siteName}`,
      description,
      url: absoluteUrl(routes.gallery.about),
      // og:image JPEG dari ../opengraph-image.ts (foto profil WebP tidak selalu tampil di pratinjau WhatsApp).
    },
  };
}

export default async function AboutPage() {
  const profile = await getGalleryProfile();
  return <AboutView profile={profile} />;
}
