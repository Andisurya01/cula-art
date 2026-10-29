"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

/** Provider untuk Galeri dan Studio. Provider khusus Studio ada di `layout/studio-providers.tsx`. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
