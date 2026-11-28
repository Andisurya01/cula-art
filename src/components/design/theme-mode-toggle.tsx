"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { switchModeWithReveal } from "@/components/motion/theme-switch";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tombol ganti mode terang/gelap untuk Galeri dan Studio (T11). Pilihan disimpan next-themes di
 * localStorage. Ikon dan label diganti lewat CSS (`dark:`), bukan state, supaya HTML server dan
 * client sama (tanpa hydration mismatch dan tanpa kedip).
 * Fase 7 (A7): mode baru tersingkap melingkar dari tombol ini; tanpa dukungan browser, animasi Mati,
 * atau "kurangi gerakan" langsung berganti.
 */
export function ThemeModeToggle({
  withLabel = false,
  variant = "ghost",
  className,
}: {
  withLabel?: boolean;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={withLabel ? "default" : "icon"}
      aria-label={withLabel ? undefined : "Ganti mode terang/gelap"}
      onClick={(event) =>
        switchModeWithReveal(resolvedTheme === "dark" ? "light" : "dark", setTheme, event.currentTarget)
      }
      className={cn(withLabel && "justify-start", className)}
    >
      <Sun aria-hidden className="hidden dark:block" />
      <Moon aria-hidden className="dark:hidden" />
      {withLabel && (
        <>
          <span className="dark:hidden">Mode gelap</span>
          <span className="hidden dark:inline">Mode terang</span>
        </>
      )}
    </Button>
  );
}
