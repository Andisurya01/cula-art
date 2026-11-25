"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { QUICK_IDEA_BUTTON_CLASS, StudioMark } from "./studio-mark";
import { useLayoutUi } from "./ui-store";

/**
 * Sidebar desktop (≥ 768 px), gaya referensi Studio: panel putih radius kartu di atas latar abu,
 * menu berbentuk pil (aktif = pil primer), tombol + Ide berwarna lime agar beda dari menu aktif.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const setQuickIdeaOpen = useLayoutUi((s) => s.setQuickIdeaOpen);

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 p-3 pr-0 md:flex">
      <div className="flex min-h-0 w-full flex-col rounded-card bg-card text-card-foreground ring-1 ring-border/70">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <StudioMark />
          <div className="min-w-0">
            <p className="font-heading text-h6">Studio</p>
            <p className="text-caption text-muted-foreground">Konten &amp; karya</p>
          </div>
        </div>
        <div className="px-3 pb-3">
          <Button
            className={cn("h-10 w-full justify-start px-3.5", QUICK_IDEA_BUTTON_CLASS)}
            onClick={() => setQuickIdeaOpen(true)}
          >
            <Plus />
            Ide
            <kbd className="ml-auto rounded-badge border border-current/30 px-1.5 font-mono text-caption">N</kbd>
          </Button>
        </div>
        <nav aria-label="Menu Studio" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <ul className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-button px-3.5 text-body-sm transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t p-3">
          <ThemeModeToggle withLabel className="h-10 w-full px-3.5 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
