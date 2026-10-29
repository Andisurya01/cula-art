"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={withLabel ? "default" : "icon"}
      aria-label="Ganti tema terang/gelap"
      onClick={() => setTheme(next)}
      className={withLabel ? "w-full justify-start" : undefined}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
      {withLabel && <span>Tema terang/gelap</span>}
    </Button>
  );
}
