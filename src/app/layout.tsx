import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site";
import { buildThemeCss } from "@/lib/theme/css";
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
  const theme = await getTheme();
  return (
    <html lang="id" suppressHydrationWarning className={`${fontVariableClassNames} h-full antialiased`}>
      <head>
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
      </head>
      <body className="min-h-full">
        <Providers defaultMode={theme.defaultMode}>{children}</Providers>
      </body>
    </html>
  );
}
