// Instance next/font untuk daftar font terkurasi (T2). File font diunduh saat build dan di-host
// sendiri (tanpa request ke Google saat dipakai). Semua kelas variabel dipasang di <html>, tetapi
// browser hanya mengunduh file font yang benar-benar dipakai teks di halaman; hanya font default
// (Inter Tight, Inter, Geist Mono) yang di-preload.
// Nama `variable` wajib sama dengan `FONT_OPTIONS[id].cssVariable` (dicek fonts.static.test.ts).

import {
  DM_Sans,
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Inter,
  Inter_Tight,
  Manrope,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: true });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap", preload: true });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap", preload: false });
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap", preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});
/** Angka dan kode (tetap, tidak ikut kustomisasi). */
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: true });

/** Kelas variabel semua font untuk `<html>`. */
export const fontVariableClassNames = [
  inter,
  interTight,
  geist,
  plusJakartaSans,
  manrope,
  dmSans,
  spaceGrotesk,
  instrumentSerif,
  geistMono,
]
  .map((font) => font.variable)
  .join(" ");
