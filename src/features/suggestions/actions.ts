"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fromZodError, ok, type ActionResult } from "@/lib/action";
import { dismissUntil } from "@/lib/analytics/rules";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { dismissSuggestionSchema } from "./schema";

/** Sembunyikan satu saran selama 7 hari (E6). Menyembunyikan lagi memperpanjang dari sekarang. */
export async function dismissSuggestion(input: unknown): Promise<ActionResult<{ until: Date }>> {
  await requireAdmin();
  const parsed = dismissSuggestionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const now = new Date();
  const until = dismissUntil(now);
  await db.$transaction([
    // Baris yang sudah lewat tidak berguna lagi; dirapikan di sini supaya tabel tetap kecil.
    db.suggestionDismissal.deleteMany({ where: { until: { lte: now } } }),
    db.suggestionDismissal.upsert({
      where: { key: parsed.data.key },
      update: { until },
      create: { key: parsed.data.key, until },
    }),
  ]);

  revalidatePath(routes.studio.home);
  revalidatePath(routes.studio.review);
  return ok({ until });
}
