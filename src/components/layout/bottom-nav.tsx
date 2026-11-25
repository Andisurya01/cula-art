"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_HREFS, isActivePath, NAV_ITEMS, type NavItem } from "./nav-items";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { QUICK_IDEA_BUTTON_CLASS } from "./studio-mark";
import { useLayoutUi } from "./ui-store";

/** Satu sel bottom nav: tinggi penuh bilah (52 px), jadi target sentuh selalu ≥ 40 px. */
const CELL =
  "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-button text-caption transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring";

function cellState(active: boolean) {
  return active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground";
}

/**
 * Bottom navigation HP (< 768 px): Beranda, Pipeline, + Ide, Kalender, Lainnya. Bilah putih mengambang
 * di atas latar abu; menu aktif = pil primer, + Ide = pil lime.
 */
export function BottomNav() {
  const pathname = usePathname();
  const setQuickIdeaOpen = useLayoutUi((s) => s.setQuickIdeaOpen);
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = BOTTOM_NAV_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)!);
  const more = NAV_ITEMS.filter((i) => !BOTTOM_NAV_HREFS.some((href) => href === i.href));
  const moreActive = more.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Menu Studio"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 gap-1 rounded-card bg-card/95 p-1.5 text-card-foreground shadow-lg ring-1 ring-border/70 backdrop-blur">
          <NavLink item={primary[0]} active={isActivePath(pathname, primary[0].href)} />
          <NavLink item={primary[1]} active={isActivePath(pathname, primary[1].href)} />
          <button
            type="button"
            onClick={() => setQuickIdeaOpen(true)}
            className={cn(CELL, QUICK_IDEA_BUTTON_CLASS, "font-medium")}
            aria-label="Tambah ide"
          >
            <Plus className="size-5" aria-hidden />
            Ide
          </button>
          <NavLink item={primary[2]} active={isActivePath(pathname, primary[2].href)} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(CELL, cellState(moreActive))}
          >
            <Menu className="size-5" aria-hidden />
            Lainnya
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle className="font-heading text-h5">Menu lainnya</SheetTitle>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {more.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full min-h-20 flex-col items-center justify-center gap-1.5 rounded-card-nested p-3 text-center text-caption transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-[color-mix(in_srgb,var(--muted),var(--foreground)_6%)]",
                    )}
                  >
                    <item.icon className="size-5" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="px-4">
            <ThemeModeToggle withLabel variant="outline" className="h-10 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(CELL, cellState(active))}>
      <item.icon className="size-5" aria-hidden />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
