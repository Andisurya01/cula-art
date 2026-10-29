import Link from "next/link";
import { routes } from "@/lib/routes";
import type { GalleryProfile } from "../../dto";
import { GalleryDesktopNav, GalleryMobileNav } from "./gallery-nav";
import { SocialLinks } from "./social-links";

export function GalleryHeader({ profile }: { profile: GalleryProfile }) {
  const social = { instagramUrl: profile.instagramUrl, tiktokUrl: profile.tiktokUrl };
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link
          href={routes.gallery.home}
          className="font-display truncate text-xl leading-none tracking-tight sm:text-2xl"
        >
          {profile.siteName}
        </Link>
        <div className="flex items-center gap-4">
          <GalleryDesktopNav />
          <SocialLinks social={social} className="hidden md:flex" />
          <GalleryMobileNav siteName={profile.siteName} social={social} />
        </div>
      </div>
    </header>
  );
}
