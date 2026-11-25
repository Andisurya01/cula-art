"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { defaultThemeTokens } from "@/lib/theme/defaults";
import { THEME_VERSION, themeTokensSchema, type ThemeTokens } from "@/lib/theme/schema";
import { THEME_SETTING_ID } from "./queries";

/**
 * Tema dipakai root layout, jadi seluruh situs (Galeri yang di-cache, `/masuk`, Studio) dirender
 * ulang. `revalidatePath("/", "layout")` mencakup semua route di bawah root layout.
 */
function revalidateWholeSite() {
  revalidatePath(routes.gallery.home, "layout");
}

/** Simpan tema (T8, T9). Input divalidasi ketat; payload jahat ditolak sebelum menyentuh DB. */
export async function saveTheme(input: unknown): Promise<ActionResult<{ tokens: ThemeTokens; updatedAt: string }>> {
  await requireAdmin();
  const parsed = themeTokensSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const data = { version: THEME_VERSION, tokensJson: JSON.stringify(parsed.data) };
  let row: { updatedAt: Date };
  try {
    row = await db.themeSetting.upsert({
      where: { id: THEME_SETTING_ID },
      create: { id: THEME_SETTING_ID, ...data },
      update: data,
      select: { updatedAt: true },
    });
  } catch (error) {
    // Dua simpan bersamaan pada tabel kosong: yang kalah cukup memperbarui baris yang baru dibuat.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    row = await db.themeSetting.update({ where: { id: THEME_SETTING_ID }, data, select: { updatedAt: true } });
  }

  revalidateWholeSite();
  return ok({ tokens: parsed.data, updatedAt: row.updatedAt.toISOString() });
}

/** Reset ke tampilan awal: baris dihapus, jadi default di kode berlaku lagi (termasuk perbaikan default nanti). */
export async function resetTheme(): Promise<ActionResult<{ tokens: ThemeTokens }>> {
  await requireAdmin();
  try {
    await db.themeSetting.deleteMany({ where: { id: THEME_SETTING_ID } });
  } catch {
    return fail("Tampilan gagal di-reset. Coba lagi.");
  }
  revalidateWholeSite();
  return ok({ tokens: defaultThemeTokens() });
}
