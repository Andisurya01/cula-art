"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_HREFS, isActivePath, NAV_ITEMS, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { useLayoutUi } from "./ui-store";

/** Bottom navigation HP (< 768 px): Beranda, Pipeline, + Ide, Kalender, Lainnya. */
export function BottomNav() {
  const pathname = usePathname();
  const setQuickIdeaOpen = useLayoutUi((s) => s.setQuickIdeaOpen);
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = BOTTOM_NAV_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)!);
  const more = NAV_ITEMS.filter((i) => !BOTTOM_NAV_HREFS.some((href) => href === i.href));
  const moreActive = more.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-5">
          <NavLink item={primary[0]} active={isActivePath(pathname, primary[0].href)} />
          <NavLink item={primary[1]} active={isActivePath(pathname, primary[1].href)} />
          <button
            type="button"
            onClick={() => setQuickIdeaOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
            aria-label="Tambah ide"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="size-5" />
            </span>
            Ide
          </button>
          <NavLink item={primary[2]} active={isActivePath(pathname, primary[2].href)} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px]",
              moreActive ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <Menu className="size-5" />
            Lainnya
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>Menu lainnya</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4">
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs",
                  isActivePath(pathname, item.href) ? "border-primary bg-muted font-medium" : "",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="px-4">
            <ThemeToggle withLabel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-[11px]",
        active ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  );
}
