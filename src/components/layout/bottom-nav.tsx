"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_HREFS, isActivePath, NAV_ITEMS, type NavItem } from "./nav-items";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { NAV_PILL_NAME, NavPill } from "./nav-pill";
import { QUICK_IDEA_BUTTON_CLASS } from "./studio-mark";
import { useLayoutUi } from "./ui-store";

/** Tata letak isi sel; dipakai sel dan salinannya di pil aktif supaya posisinya sama persis. */
const CELL_LAYOUT = "flex min-w-0 flex-col items-center justify-center gap-0.5";

/**
 * Satu sel bottom nav: tinggi penuh bilah (52 px), jadi target sentuh selalu ≥ 40 px. Warna berganti
 * dengan durasi/easing token; ditekan sedikit mengecil (0,98, mati saat animasi Mati/kurangi gerakan).
 */
const CELL = `${CELL_LAYOUT} relative h-full rounded-button text-caption outline-hidden transition-[color,background-color,scale] duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-ring active:motion-press`;

function cellState(active: boolean) {
  return active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground";
}

/** Ikon + label sel (juga isi pil aktif). */
function CellContent({ icon: Icon, label }: { icon: NavItem["icon"]; label: string }) {
  return (
    <>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </>
  );
}

/** Pil aktif yang berpindah antarsel saat navigasi (`NavPill`). */
function CellPill({ icon, label }: { icon: NavItem["icon"]; label: string }) {
  return (
    <NavPill name={NAV_PILL_NAME.bottom} className={CELL_LAYOUT}>
      <CellContent icon={icon} label={label} />
    </NavPill>
  );
}

/**
 * Bottom navigation HP (< 768 px): Beranda, Pipeline, + Ide, Kalender, Lainnya. Bilah putih mengambang
 * di atas latar abu; menu aktif = pil primer yang bergeser ke sel baru saat navigasi, + Ide = pil lime.
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
            {moreActive && <CellPill icon={Menu} label="Lainnya" />}
            <CellContent icon={Menu} label="Lainnya" />
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
                      "flex h-full min-h-20 flex-col items-center justify-center gap-1.5 rounded-card-nested p-3 text-center text-caption outline-hidden transition-[color,background-color,scale] duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-ring active:motion-press",
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
      {active && <CellPill icon={item.icon} label={item.label} />}
      <CellContent icon={item.icon} label={item.label} />
    </Link>
  );
}
