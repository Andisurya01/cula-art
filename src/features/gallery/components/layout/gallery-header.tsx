import Link from "next/link";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { routes } from "@/lib/routes";
import type { GalleryProfile } from "../../dto";
import { galleryContainer } from "../section-heading";
import { GalleryDesktopNav, GalleryMobileNav } from "./gallery-nav";

/**
 * Header Galeri (gaya referensi): nama situs, menu teks di desktop, tombol mode terang/gelap, dan
 * tombol menu bulat (lingkaran primer) di HP. Tanpa garis bawah supaya menyatu dengan latar.
 */
export function GalleryHeader({ profile }: { profile: GalleryProfile }) {
  const social = { instagramUrl: profile.instagramUrl, tiktokUrl: profile.tiktokUrl };
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className={`${galleryContainer} flex h-16 items-center justify-between gap-3 sm:h-20`}>
        <Link
          href={routes.gallery.home}
          className="min-w-0 truncate rounded-button font-heading text-h5 outline-hidden focus-visible:ring-3 focus-visible:ring-ring"
        >
          {profile.siteName}
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <GalleryDesktopNav />
          <ThemeModeToggle className="size-11 rounded-full" />
          <GalleryMobileNav siteName={profile.siteName} social={social} />
        </div>
      </div>
    </header>
  );
}
