import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site";
import { buildThemeCss } from "@/lib/theme/css";
import { MOTION_INIT_SCRIPT, motionSideAttributes } from "@/lib/theme/motion";
import { fontVariableClassNames } from "@/features/theme/fonts";
import { getTheme } from "@/features/theme/queries";
import "./globals.css";

// Judul dan deskripsi Galeri diatur di layout (galeri) dari Setting.siteName; Studio di layout studio.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Galeri & Studio Karya", template: "%s" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Token tema dirender server sebagai <style> (T10): warna, font, dan ukuran benar sejak frame
  // pertama. Mode (terang/gelap) dipasang skrip next-themes sebelum paint. Menyimpan tema
  // me-revalidate seluruh situs, termasuk halaman Galeri yang di-cache.
  // Animasi (Fase 7, A3): tingkat per sisi dari token di atribut <html>; skrip statis di <head> memilih
  // sisi dari path dan "kurangi gerakan", lalu menulis `data-motion` sebelum isi dilukis.
  const theme = await getTheme();
  const levels = { gallery: theme.motion.gallery, studio: theme.motion.studio };
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${fontVariableClassNames} h-full antialiased`}
      {...motionSideAttributes(levels)}
    >
      <head>
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
        <script id="motion-init" dangerouslySetInnerHTML={{ __html: MOTION_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Providers defaultMode={theme.defaultMode} motion={levels}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
