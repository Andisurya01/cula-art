// Label dan pengelompokan token untuk menu Tampilan. Fungsi murni (tanpa React).

import type { ColorKey, MotionLevel, ThemeMode, TypeLevel } from "./schema";

export const MODE_LABELS: Record<ThemeMode, string> = {
  system: "Ikuti sistem",
  light: "Terang",
  dark: "Gelap",
};

export const COLOR_LABELS: Record<ColorKey, string> = {
  background: "Latar",
  surface: "Permukaan / kartu",
  text: "Teks",
  textMuted: "Teks redup",
  border: "Garis",
  input: "Garis input",
  ring: "Fokus",
  primary: "Primer",
  primaryText: "Teks primer",
  secondary: "Sekunder",
  secondaryText: "Teks sekunder",
  accent: "Aksen",
  accentText: "Teks aksen",
  destructive: "Destruktif",
  success: "Sukses",
  warning: "Peringatan",
  bentoBlue: "Bento biru",
  bentoBlueText: "Teks bento biru",
  bentoLime: "Bento lime",
  bentoLimeText: "Teks bento lime",
  bentoPurple: "Bento ungu",
  bentoPurpleText: "Teks bento ungu",
  bentoDark: "Bento gelap",
  bentoDarkText: "Teks bento gelap",
  headingSecondary: "Judul baris kedua",
};

export const COLOR_GROUPS: readonly { id: string; label: string; keys: readonly ColorKey[] }[] = [
  {
    id: "dasar",
    label: "Dasar",
    keys: ["background", "surface", "text", "textMuted", "border", "input", "ring"],
  },
  {
    id: "aksi",
    label: "Aksi",
    keys: [
      "primary",
      "primaryText",
      "secondary",
      "secondaryText",
      "accent",
      "accentText",
      "destructive",
      "success",
      "warning",
    ],
  },
  {
    id: "bento",
    label: "Bento",
    keys: [
      "bentoBlue",
      "bentoBlueText",
      "bentoLime",
      "bentoLimeText",
      "bentoPurple",
      "bentoPurpleText",
      "bentoDark",
      "bentoDarkText",
    ],
  },
  { id: "judul", label: "Judul dua warna", keys: ["headingSecondary"] },
];

export const TYPE_LEVEL_LABELS: Record<TypeLevel, string> = {
  display: "Display (hero Galeri)",
  h1: "H1",
  h2: "H2",
  h3: "H3 (judul halaman Studio)",
  h4: "H4",
  h5: "H5",
  h6: "H6",
};

export const SHAPE_LABELS = {
  card: "Kartu",
  cardNested: "Kartu bertingkat",
  button: "Tombol",
  input: "Input",
  badge: "Badge",
  image: "Gambar",
  dialog: "Dialog / sheet",
} as const;

export const WEIGHT_LABELS: Record<number, string> = {
  300: "300 · Tipis",
  400: "400 · Normal",
  500: "500 · Medium",
  600: "600 · Semi tebal",
  700: "700 · Tebal",
  800: "800 · Ekstra tebal",
};

/** Tingkat animasi per sisi (Fase 7, A2). */
export const MOTION_LEVEL_LABELS: Record<MotionLevel, { label: string; description: string }> = {
  off: { label: "Mati", description: "Tanpa animasi; hanya pergantian langsung." },
  subtle: { label: "Halus", description: "Gerak singkat dan dekat, tanpa geser jauh." },
  full: { label: "Penuh", description: "Semua efek: muncul berjeda, judul per baris, hitung naik." },
};
