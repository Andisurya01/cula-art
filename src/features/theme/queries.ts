import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { defaultThemeTokens } from "@/lib/theme/defaults";
import { parseThemeTokens, THEME_VERSION, type ThemeTokens } from "@/lib/theme/schema";

export const THEME_SETTING_ID = "default";

/**
 * Tema aktif, sekali per request (root layout + menu Tampilan memakai hasil yang sama).
 * Tanpa baris, versi yang lebih baru dari kode ini, atau JSON tidak valid → tampilan awal. Versi lama
 * (v1, sebelum Fase 7) dilengkapi nilai default oleh `parseThemeTokens`. Hanya membaca, tidak membuat baris.
 */
export const getTheme = cache(async (): Promise<ThemeTokens> => {
  let row: { version: number; tokensJson: string } | null;
  try {
    row = await db.themeSetting.findUnique({
      where: { id: THEME_SETTING_ID },
      select: { version: true, tokensJson: true },
    });
  } catch (error) {
    // Root layout membaca tema di setiap halaman: DB yang sedang bermasalah tidak boleh membuat
    // halaman yang tidak butuh DB lain (mis. error/404) ikut gagal. Halaman lain tetap gagal sendiri.
    console.error("Tema tidak bisa dibaca; memakai tampilan awal.", error);
    return defaultThemeTokens();
  }
  if (!row) return defaultThemeTokens();
  const tokens = row.version <= THEME_VERSION ? parseThemeTokens(row.tokensJson) : null;
  if (!tokens) {
    console.warn("ThemeSetting tidak valid; memakai tampilan awal.");
    return defaultThemeTokens();
  }
  return tokens;
});

/** Untuk menu Tampilan: token + apakah sudah pernah disimpan (tombol Reset aktif). */
export async function getThemeSettings(): Promise<{ tokens: ThemeTokens; isCustomized: boolean; updatedAt: Date | null }> {
  const [tokens, row] = await Promise.all([
    getTheme(),
    db.themeSetting.findUnique({ where: { id: THEME_SETTING_ID }, select: { updatedAt: true } }),
  ]);
  return { tokens, isCustomized: row !== null, updatedAt: row?.updatedAt ?? null };
}
