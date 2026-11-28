"use client";

import { ThemeProvider } from "next-themes";
import { MotionRoot } from "@/components/motion/motion-root";
import { Toaster } from "@/components/ui/sonner";
import type { MotionLevels } from "@/lib/theme/motion";
import type { ThemeMode } from "@/lib/theme/schema";

/**
 * Provider untuk Galeri dan Studio. Provider khusus Studio ada di `layout/studio-providers.tsx`.
 * Pilihan mode pengunjung disimpan next-themes di localStorage (bukan cookie, T11); tanpa pilihan,
 * berlaku mode default dari menu Tampilan. `motion` = tingkat animasi per sisi dari token (Fase 7).
 */
export function Providers({
  children,
  defaultMode,
  motion,
}: {
  children: React.ReactNode;
  defaultMode: ThemeMode;
  motion: MotionLevels;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme={defaultMode} enableSystem disableTransitionOnChange>
      <MotionRoot gallery={motion.gallery} studio={motion.studio} />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
