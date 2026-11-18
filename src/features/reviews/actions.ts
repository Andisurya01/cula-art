"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { isReviewableWeek } from "@/lib/analytics/review";
import { wibToUtc } from "@/lib/date";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { getLiveSummary } from "./queries";
import { saveWeeklyReviewSchema } from "./schema";
import { freezeSummary } from "./summary";

/**
 * Simpan review satu minggu (upsert per `weekStart`). Ringkasan selalu dihitung ulang di server dari
 * angka terkini lalu dibekukan di `summaryJson`; ringkasan dari client diabaikan. Simpan ulang
 * membekukan ulang angka terbaru. Beranda ikut di-revalidate karena pengingat membaca review tersimpan.
 */
export async function saveWeeklyReview(
  input: unknown,
): Promise<ActionResult<{ weekStart: string; frozenAt: Date }>> {
  await requireAdmin();
  const parsed = saveWeeklyReviewSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { weekStart: weekKey, plannedContentIds } = parsed.data;

  const now = new Date();
  const weekStart = wibToUtc(weekKey);
  if (!isReviewableWeek(weekStart, now)) {
    return fail("Minggu ini belum bisa di-review. Pilih minggu yang sudah berjalan.");
  }

  if (plannedContentIds.length > 0) {
    const found = await db.content.count({ where: { id: { in: plannedContentIds } } });
    if (found !== plannedContentIds.length) return fail("Konten rencana tidak ditemukan. Muat ulang halaman.");
  }

  const { data } = await getLiveSummary(weekStart, now);
  const text = (value: string) => value.trim() || null;
  const fields = {
    wins: text(parsed.data.wins),
    repeat: text(parsed.data.repeat),
    stop: text(parsed.data.stop),
    focusNext: text(parsed.data.focusNext),
    summaryJson: freezeSummary(data, now),
    plannedContentIds,
  };

  try {
    await db.weeklyReview.upsert({ where: { weekStart }, update: fields, create: { weekStart, ...fields } });
  } catch (error) {
    // Dua simpan bersamaan untuk minggu baru: yang kalah cukup memperbarui baris yang baru dibuat.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    await db.weeklyReview.update({ where: { weekStart }, data: fields });
  }

  revalidatePath(routes.studio.review);
  revalidatePath(routes.studio.home);
  return ok({ weekStart: weekKey, frozenAt: now });
}
