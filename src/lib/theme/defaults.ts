// Nilai default dan preset tema (T12). Monokrom (ala referensi Euronium) = tampilan awal;
// Bento (ala referensi AKA) menonjolkan aksen biru dan lime. Semua pasangan lolos T4 (dicek test).

import type { ColorSet, ThemeTokens } from "./schema";
import { MOTION_V2_DEFAULTS, THEME_VERSION } from "./schema";

const MONOKROM_LIGHT: ColorSet = {
  background: "#F5F5F3",
  surface: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#6B6B6B",
  border: "#E4E4E1",
  input: "#E4E4E1",
  ring: "#6E4FD8",
  primary: "#0A0A0A",
  primaryText: "#FFFFFF",
  secondary: "#ECECEA",
  secondaryText: "#0A0A0A",
  accent: "#6E4FD8",
  accentText: "#FFFFFF",
  // Status dipakai sebagai teks di latar polos DAN di latar tipis (status 10-15%, badge/tombol
  // destruktif), jadi digelapkan sampai lolos 4,5:1 di keduanya (FASE-6 menulis #D92D20).
  destructive: "#A8221A",
  success: "#05603A",
  warning: "#93370D",
  bentoBlue: "#1463FF",
  bentoBlueText: "#FFFFFF",
  bentoLime: "#C6F432",
  bentoLimeText: "#0A0A0A",
  bentoPurple: "#6E4FD8",
  bentoPurpleText: "#FFFFFF",
  bentoDark: "#23252B",
  bentoDarkText: "#F5F5F3",
  headingSecondary: "#8A8A8A",
};

const MONOKROM_DARK: ColorSet = {
  background: "#0B0B0C",
  surface: "#161618",
  text: "#F5F5F3",
  textMuted: "#9A9A9F",
  border: "#2A2A2E",
  input: "#2A2A2E",
  ring: "#9B83F0",
  primary: "#F5F5F3",
  primaryText: "#0A0A0A",
  secondary: "#242427",
  secondaryText: "#F5F5F3",
  accent: "#9B83F0",
  accentText: "#0A0A0A",
  destructive: "#FF7A70",
  success: "#47CD89",
  warning: "#FDB022",
  bentoBlue: "#1463FF",
  bentoBlueText: "#FFFFFF",
  bentoLime: "#C6F432",
  bentoLimeText: "#0A0A0A",
  bentoPurple: "#7B5FE6",
  bentoPurpleText: "#FFFFFF",
  bentoDark: "#23252B",
  bentoDarkText: "#F5F5F3",
  headingSecondary: "#6E6E73",
};

const MONOKROM: ThemeTokens = {
  version: THEME_VERSION,
  defaultMode: "system",
  colors: { light: MONOKROM_LIGHT, dark: MONOKROM_DARK },
  typography: {
    headingFont: "inter-tight",
    bodyFont: "inter",
    levels: {
      display: { sizeDesktop: 112, sizeMobile: 52, weight: 500, lineHeight: 0.95, letterSpacing: -0.045 },
      h1: { sizeDesktop: 72, sizeMobile: 40, weight: 500, lineHeight: 1, letterSpacing: -0.04 },
      h2: { sizeDesktop: 48, sizeMobile: 32, weight: 500, lineHeight: 1.05, letterSpacing: -0.035 },
      h3: { sizeDesktop: 32, sizeMobile: 24, weight: 500, lineHeight: 1.15, letterSpacing: -0.02 },
      h4: { sizeDesktop: 24, sizeMobile: 20, weight: 500, lineHeight: 1.25, letterSpacing: -0.01 },
      h5: { sizeDesktop: 18, sizeMobile: 17, weight: 600, lineHeight: 1.35, letterSpacing: 0 },
      h6: { sizeDesktop: 15, sizeMobile: 15, weight: 600, lineHeight: 1.4, letterSpacing: 0 },
    },
    body: {
      sizeLg: 18,
      sizeBase: 16,
      sizeSm: 14,
      sizeCaption: 12,
      weight: 400,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    label: { size: 11, weight: 500, lineHeight: 1.2, letterSpacing: 0.06, uppercase: true },
  },
  shape: {
    card: 28,
    cardNested: 20,
    button: 12,
    buttonPill: true,
    input: 14,
    badge: 8,
    badgePill: true,
    image: 24,
    dialog: 28,
  },
  // Fase 7 (A2, A6): Galeri Penuh, Studio Halus (dipakai setiap hari, jadi gerak singkat).
  motion: { fast: 150, base: 250, slow: 450, easing: "smooth", ...MOTION_V2_DEFAULTS },
};

const BENTO: ThemeTokens = {
  ...MONOKROM,
  colors: {
    light: {
      ...MONOKROM_LIGHT,
      background: "#EFEFEF",
      surface: "#FFFFFF",
      text: "#111111",
      textMuted: "#5F6064",
      border: "#E2E2E2",
      input: "#E2E2E2",
      ring: "#1463FF",
      primary: "#141414",
      primaryText: "#FFFFFF",
      secondary: "#F4F4F4",
      secondaryText: "#111111",
      accent: "#1463FF",
      accentText: "#FFFFFF",
      headingSecondary: "#85868A",
    },
    dark: {
      ...MONOKROM_DARK,
      background: "#0E0F12",
      surface: "#1A1B20",
      text: "#F4F4F5",
      textMuted: "#A0A1A8",
      border: "#2C2D33",
      input: "#2C2D33",
      ring: "#C6F432",
      primary: "#F4F4F5",
      primaryText: "#111111",
      secondary: "#26272D",
      secondaryText: "#F4F4F5",
      accent: "#C6F432",
      accentText: "#0A0A0A",
      bentoDark: "#2B2D35",
      headingSecondary: "#74757C",
    },
  },
  typography: {
    ...MONOKROM.typography,
    headingFont: "plus-jakarta-sans",
    bodyFont: "plus-jakarta-sans",
    levels: {
      display: { sizeDesktop: 88, sizeMobile: 44, weight: 500, lineHeight: 1, letterSpacing: -0.035 },
      h1: { sizeDesktop: 60, sizeMobile: 36, weight: 500, lineHeight: 1.05, letterSpacing: -0.03 },
      h2: { sizeDesktop: 42, sizeMobile: 30, weight: 500, lineHeight: 1.1, letterSpacing: -0.025 },
      h3: { sizeDesktop: 28, sizeMobile: 22, weight: 500, lineHeight: 1.2, letterSpacing: -0.015 },
      h4: { sizeDesktop: 22, sizeMobile: 19, weight: 500, lineHeight: 1.3, letterSpacing: -0.01 },
      h5: { sizeDesktop: 18, sizeMobile: 17, weight: 600, lineHeight: 1.35, letterSpacing: 0 },
      h6: { sizeDesktop: 15, sizeMobile: 15, weight: 600, lineHeight: 1.4, letterSpacing: 0 },
    },
    label: { size: 12, weight: 500, lineHeight: 1.2, letterSpacing: 0.02, uppercase: false },
  },
  shape: { ...MONOKROM.shape, card: 28, cardNested: 22, input: 16, image: 22 },
};

export const PRESET_IDS = ["monokrom", "bento"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const THEME_PRESETS: Record<PresetId, { label: string; description: string; tokens: ThemeTokens }> = {
  monokrom: {
    label: "Monokrom",
    description: "Hitam-putih editorial, judul besar dua warna (bawaan).",
    tokens: MONOKROM,
  },
  bento: {
    label: "Bento",
    description: "Latar abu muda, aksen biru dan lime lebih menonjol.",
    tokens: BENTO,
  },
};

/** Tampilan awal. Selalu salinan baru, supaya pemanggil tidak bisa mengubah konstanta. */
export function defaultThemeTokens(): ThemeTokens {
  return structuredClone(MONOKROM);
}

/** Isi preset (salinan baru); mode default pengunjung yang sedang dipilih tetap dipertahankan. */
export function applyPreset(current: ThemeTokens, preset: PresetId): ThemeTokens {
  return { ...structuredClone(THEME_PRESETS[preset].tokens), defaultMode: current.defaultMode };
}

/** Preset yang persis sama dengan token (selain mode default), atau `null` jika sudah diubah. */
export function matchingPreset(tokens: ThemeTokens): PresetId | null {
  const strip = (t: ThemeTokens) => canonicalJson({ ...t, defaultMode: "system" });
  const current = strip(tokens);
  return PRESET_IDS.find((id) => strip(THEME_PRESETS[id].tokens) === current) ?? null;
}

/** JSON dengan kunci terurut: dua token sama walau urutan kuncinya beda. Hex dibandingkan huruf besar. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return JSON.stringify(value.toUpperCase());
  return JSON.stringify(value);
}

/** Dua set token sama (untuk tombol Simpan/Batalkan dan peringatan perubahan belum tersimpan). */
export function themeTokensEqual(a: ThemeTokens, b: ThemeTokens): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
