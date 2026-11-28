"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { motionIndex } from "@/components/motion/motion-utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import { GALLERY_NAV, isGalleryNavActive } from "./nav";
import { SocialLinks, type SocialLinkData } from "./social-links";

/** Titik kecil penanda halaman aktif (gaya label "• TENTANG" referensi). */
function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full bg-foreground transition-opacity", active ? "opacity-100" : "opacity-0")}
    />
  );
}

/** Menu desktop (≥ 768 px): tautan teks; halaman aktif berwarna teks utama dengan titik. */
export function GalleryDesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={galleryCopy.nav.mainLabel} className="mr-2 hidden items-center gap-1 md:flex">
      {GALLERY_NAV.map((item) => {
        const active = isGalleryNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-button px-3 text-body-sm font-medium transition-colors outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <ActiveDot active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Ikon garis tiga ↔ silang yang berputar dan berganti (transisi token; diam saat Mati). */
const iconSwap = "absolute size-5 transition-[rotate,scale,opacity] duration-base ease-standard";

/** Tombol bulat primer: sama di header dan di panel, supaya tombol menu tampak berubah menjadi tanda tutup. */
const roundButton =
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors outline-hidden hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring";

/**
 * Tombol menu bulat (lingkaran primer) + panel menu di HP.
 * Fase 7: panel dan latar masuk (Sheet, durasi token), tautan muncul berjeda saat panel terpasang, dan
 * tombol bulat berubah menjadi tanda tutup: ikon garis berputar menjadi silang (status `data-state`
 * dari Radix). Tombol tutup panel berada tepat di posisi tombol menu, jadi peralihannya menyambung;
 * saat panel ditutup, ikon tombol menu berputar kembali. Kunci gulir, fokus, dan Escape dari Radix.
 */
export function GalleryMobileNav({ siteName, social }: { siteName: string; social: SocialLinkData }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={cn(roundButton, "group/menu md:hidden")} aria-label={galleryCopy.nav.menu}>
          <Menu
            aria-hidden="true"
            className={cn(iconSwap, "group-data-[state=open]/menu:rotate-90 group-data-[state=open]/menu:scale-50 group-data-[state=open]/menu:opacity-0")}
          />
          <X
            aria-hidden="true"
            className={cn(
              iconSwap,
              "-rotate-90 scale-50 opacity-0 group-data-[state=open]/menu:rotate-0 group-data-[state=open]/menu:scale-100 group-data-[state=open]/menu:opacity-100",
            )}
          />
        </button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} aria-describedby={undefined} className="w-[88vw] max-w-sm gap-0">
        {/* Jarak atas/kanan sama dengan tombol menu di header (h-16/h-20, gutter 16/24 px). */}
        <SheetHeader className="flex-row items-center justify-between gap-3 px-4 pt-2.5 pb-4 sm:px-6 sm:pt-4.5">
          <SheetTitle className="min-w-0 truncate text-h5">{siteName}</SheetTitle>
          <SheetClose asChild>
            <button type="button" className={roundButton} aria-label={galleryCopy.nav.close}>
              <X aria-hidden="true" className="size-5" />
            </button>
          </SheetClose>
        </SheetHeader>
        <nav aria-label={galleryCopy.nav.mainLabel} className="grid gap-1 px-4 pt-4 sm:px-6">
          {GALLERY_NAV.map((item, i) => {
            const active = isGalleryNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                // Muncul berjeda saat panel terpasang (CSS murni; urutan 1.. setelah panel).
                style={motionIndex(i + 1)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-card-nested px-2 font-heading text-h3 outline-hidden motion-enter focus-visible:ring-3 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <ActiveDot active={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div
          className="mt-auto grid gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] motion-enter-fade sm:px-6"
          style={motionIndex(GALLERY_NAV.length + 1)}
        >
          <ThemeModeToggle withLabel variant="secondary" className="h-11 w-full justify-center" />
          <SocialLinks social={social} className="justify-center" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
