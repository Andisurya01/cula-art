"use client";

import { createContext, useContext } from "react";
import type { PresetId } from "@/lib/theme/defaults";
import type { ThemeTokens } from "@/lib/theme/schema";

export interface ThemeEditorContextValue {
  /** Isian form (boleh sementara tidak valid). */
  draft: ThemeTokens;
  /** Versi valid terakhir: untuk contoh warna, cek kontras, dan pratinjau. */
  preview: ThemeTokens;
  invalidPaths: ReadonlySet<string>;
  edit: (recipe: (draft: ThemeTokens) => ThemeTokens) => void;
  applyPreset: (preset: PresetId) => void;
}

export const ThemeEditorContext = createContext<ThemeEditorContextValue | null>(null);

export function useThemeEditor(): ThemeEditorContextValue {
  const value = useContext(ThemeEditorContext);
  if (!value) throw new Error("useThemeEditor dipakai di luar ThemeEditor.");
  return value;
}
