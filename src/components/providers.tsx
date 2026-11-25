"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import type { ThemeMode } from "@/lib/theme/schema";

/**
 * Provider untuk Galeri dan Studio. Provider khusus Studio ada di `layout/studio-providers.tsx`.
 * Pilihan mode pengunjung disimpan next-themes di localStorage (bukan cookie, T11); tanpa pilihan,
 * berlaku mode default dari menu Tampilan.
 */
export function Providers({ children, defaultMode }: { children: React.ReactNode; defaultMode: ThemeMode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme={defaultMode} enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
