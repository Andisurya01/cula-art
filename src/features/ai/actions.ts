"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { aiGuideContentSchema, aiTechnicalSettingsSchema, markAiRunAcceptedSchema } from "./guide-schema";
import { AI_GUIDE_ID } from "./queries";

/** Simpan isi Panduan AI (gaya bahasa, contoh, fakta, hashtag, kata dihindari). */
export async function saveAiGuideContent(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = aiGuideContentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { voice, examples, hashtagSets, ...text } = parsed.data;
  const data = {
    ...text,
    voiceJson: JSON.stringify(voice),
    examplesJson: JSON.stringify(examples),
    hashtagSetsJson: JSON.stringify(hashtagSets),
  };
  await db.aiGuide.upsert({ where: { id: AI_GUIDE_ID }, update: data, create: { id: AI_GUIDE_ID, ...data } });
  revalidatePath(routes.studio.settings);
  return ok();
}

/** Simpan pengaturan teknis (aktif/nonaktif, model, batas biaya dan panggilan). */
export async function saveAiTechnicalSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = aiTechnicalSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  await db.aiGuide.upsert({
    where: { id: AI_GUIDE_ID },
    update: parsed.data,
    create: { id: AI_GUIDE_ID, ...parsed.data },
  });
  // Status AI (tombol Bantu AI) dibaca layout Studio di setiap halaman.
  revalidatePath(routes.studio.home, "layout");
  return ok();
}

/** Pengguna menekan Pakai pada salah satu opsi run ini (dasar persentase "draf dipakai"). */
export async function markAiRunAccepted(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = markAiRunAcceptedSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { count } = await db.aiRun.updateMany({
    where: { id: parsed.data.runId, status: "OK" },
    data: { accepted: true },
  });
  return count === 1 ? ok() : fail("Run AI tidak ditemukan.");
}
