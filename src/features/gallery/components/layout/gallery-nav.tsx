"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import { GALLERY_NAV, isGalleryNavActive } from "./nav";
import { SocialLinks, type SocialLinkData } from "./social-links";

/** Menu desktop (≥ 768 px): tautan teks dengan garis bawah untuk halaman aktif. */
export function GalleryDesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu utama" className="hidden items-center gap-7 md:flex">
      {GALLERY_NAV.map((item) => {
        const active = isGalleryNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-sm tracking-wide underline-offset-[6px] transition-colors hover:text-foreground",
              active ? "text-foreground underline decoration-1" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tombol hamburger + panel menu di HP. */
export function GalleryMobileNav({ siteName, social }: { siteName: string; social: SocialLinkData }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-full md:hidden"
          aria-label={galleryCopy.nav.menu}
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">{siteName}</SheetTitle>
        </SheetHeader>
        <nav aria-label="Menu utama" className="grid gap-1 px-4">
          {GALLERY_NAV.map((item) => {
            const active = isGalleryNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "font-display rounded-lg py-3 text-2xl",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <SocialLinks social={social} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
