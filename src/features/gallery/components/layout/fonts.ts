import { Fraunces } from "next/font/google";

// Font judul serif Galeri. Dipasang lewat `galleryDisplayFont.variable` (kelas CSS --font-display)
// di GalleryShell dan pratinjau karya Studio; Studio selebihnya tetap Geist.
export const galleryDisplayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});
