"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { useLayoutUi } from "./ui-store";

/** Sidebar desktop (≥ 768 px). */
export function AppSidebar() {
  const pathname = usePathname();
  const setQuickIdeaOpen = useLayoutUi((s) => s.setQuickIdeaOpen);

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-4 pt-5 pb-3">
        <p className="text-sm font-semibold">Studio</p>
        <p className="text-xs text-muted-foreground">Konten & karya</p>
      </div>
      <div className="px-3 pb-3">
        <Button className="w-full justify-start" onClick={() => setQuickIdeaOpen(true)}>
          <Plus />
          Ide
          <kbd className="ml-auto rounded border border-primary-foreground/30 px-1.5 text-[10px]">N</kbd>
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <ThemeToggle withLabel />
      </div>
    </aside>
  );
}
