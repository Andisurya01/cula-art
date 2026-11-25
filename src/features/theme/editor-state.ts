// State editor menu Tampilan (Fase 6 langkah 5). Fungsi murni, tanpa React.
// Draf boleh sementara tidak valid (hex setengah diketik, angka kosong/di luar rentang); pratinjau
// selalu memakai versi valid terakhir, dan Simpan memvalidasi ulang dengan `themeTokensSchema`.

import { applyPreset, type PresetId } from "@/lib/theme/defaults";
import {
  themeTokensSchema,
  type ColorKey,
  type ThemeMode,
  type ThemeTokens,
  type TypeLevel,
  type TypeLevelTokens,
} from "@/lib/theme/schema";

export type ColorMode = "light" | "dark";
type Typography = ThemeTokens["typography"];

// ---- Pengubah draf (immutable: hanya cabang yang diubah yang disalin) ----

export function setDefaultMode(tokens: ThemeTokens, mode: ThemeMode): ThemeTokens {
  return { ...tokens, defaultMode: mode };
}

export function setColor(tokens: ThemeTokens, mode: ColorMode, key: ColorKey, value: string): ThemeTokens {
  return {
    ...tokens,
    colors: { ...tokens.colors, [mode]: { ...tokens.colors[mode], [key]: value } },
  };
}

export function setFonts(
  tokens: ThemeTokens,
  patch: Partial<Pick<Typography, "headingFont" | "bodyFont">>,
): ThemeTokens {
  return { ...tokens, typography: { ...tokens.typography, ...patch } };
}

export function setTypeLevel(tokens: ThemeTokens, level: TypeLevel, patch: Partial<TypeLevelTokens>): ThemeTokens {
  const levels = tokens.typography.levels;
  return {
    ...tokens,
    typography: { ...tokens.typography, levels: { ...levels, [level]: { ...levels[level], ...patch } } },
  };
}

export function setBody(tokens: ThemeTokens, patch: Partial<Typography["body"]>): ThemeTokens {
  return { ...tokens, typography: { ...tokens.typography, body: { ...tokens.typography.body, ...patch } } };
}

export function setLabel(tokens: ThemeTokens, patch: Partial<Typography["label"]>): ThemeTokens {
  return { ...tokens, typography: { ...tokens.typography, label: { ...tokens.typography.label, ...patch } } };
}

export function setShape(tokens: ThemeTokens, patch: Partial<ThemeTokens["shape"]>): ThemeTokens {
  return { ...tokens, shape: { ...tokens.shape, ...patch } };
}

export function setMotion(tokens: ThemeTokens, patch: Partial<ThemeTokens["motion"]>): ThemeTokens {
  return { ...tokens, motion: { ...tokens.motion, ...patch } };
}

// ---- Validasi ----

export interface DraftValidation {
  /** Token hasil parse (hex huruf besar) jika draf valid, selain itu `null`. */
  tokens: ThemeTokens | null;
  /** Path isian yang tidak valid, mis. `colors.light.background`, `typography.levels.h1.sizeDesktop`. */
  invalidPaths: ReadonlySet<string>;
}

export function validateDraft(draft: unknown): DraftValidation {
  const result = themeTokensSchema.safeParse(draft);
  if (result.success) return { tokens: result.data, invalidPaths: new Set() };
  return {
    tokens: null,
    invalidPaths: new Set(result.error.issues.map((issue) => issue.path.map(String).join("."))),
  };
}

/** Jumlah isian tidak valid di bawah awalan path (mis. `colors.dark`, `typography`). */
export function countInvalid(paths: ReadonlySet<string>, prefix: string): number {
  let count = 0;
  for (const path of paths) {
    if (path === prefix || path.startsWith(`${prefix}.`)) count++;
  }
  return count;
}

const HEX_INPUT = /^#?[0-9A-Fa-f]{6}$/;

/**
 * Teks dari input hex. Nilai lengkap (dengan atau tanpa `#`, huruf kecil/besar) dinormalkan menjadi
 * `#RRGGBB`; teks lain dibiarkan apa adanya (masih diketik), supaya kursor tidak melompat.
 */
export function normalizeHexInput(text: string): string {
  const trimmed = text.trim();
  if (!HEX_INPUT.test(trimmed)) return trimmed;
  return `#${trimmed.replace("#", "").toUpperCase()}`;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function hexFieldError(value: string): string | null {
  if (value.trim() === "") return "Wajib diisi.";
  return isHexColor(value) ? null : "Format warna #RRGGBB (6 digit heksadesimal).";
}

const decimalText = (value: number) => String(value).replace(".", ",");

/** Pesan untuk isian angka (rentang dari `RANGES`). `null` jika valid. */
export function numberFieldError(
  value: number,
  range: { min: number; max: number },
  options: { integer?: boolean } = {},
): string | null {
  if (!Number.isFinite(value)) return "Wajib diisi.";
  if (value < range.min || value > range.max) {
    return `Isi antara ${decimalText(range.min)} dan ${decimalText(range.max)}.`;
  }
  if (options.integer && !Number.isInteger(value)) return "Harus bilangan bulat.";
  return null;
}

// ---- Reducer editor ----

export interface EditorState {
  /** Versi tersimpan (di DB, atau default jika belum pernah disimpan). */
  saved: ThemeTokens;
  /** Isian form, boleh sementara tidak valid. */
  draft: ThemeTokens;
  /** Versi valid terakhir dari draf: dipakai pratinjau dan cek kontras. */
  preview: ThemeTokens;
  /** Ada baris ThemeSetting (tombol Reset bermakna). */
  customized: boolean;
}

export type EditorAction =
  | { type: "edit"; recipe: (draft: ThemeTokens) => ThemeTokens }
  | { type: "preset"; preset: PresetId }
  | { type: "discard" }
  | { type: "saved"; tokens: ThemeTokens }
  | { type: "reset"; tokens: ThemeTokens };

export function initEditorState(tokens: ThemeTokens, customized: boolean): EditorState {
  return { saved: tokens, draft: tokens, preview: tokens, customized };
}

function withDraft(state: EditorState, draft: ThemeTokens): EditorState {
  return { ...state, draft, preview: validateDraft(draft).tokens ?? state.preview };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "edit":
      return withDraft(state, action.recipe(state.draft));
    case "preset":
      return withDraft(state, applyPreset(state.draft, action.preset));
    case "discard":
      return { ...state, draft: state.saved, preview: state.saved };
    case "saved":
      return { saved: action.tokens, draft: action.tokens, preview: action.tokens, customized: true };
    case "reset":
      return { saved: action.tokens, draft: action.tokens, preview: action.tokens, customized: false };
  }
}
