"use server";

import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { parseWibInputValue } from "@/lib/date";
import { DEFAULT_POST_TYPE, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { scheduleContentSchema } from "./schema";

/**
 * Jadwalkan konten: untuk tiap platform terpilih, buat/ubah Post (unik per konten + platform)
 * dan set `scheduledAt`. Versi yang sudah diposting dilewati. Stage konten tidak diubah.
 */
export async function scheduleContent(
  input: unknown,
): Promise<ActionResult<{ scheduled: Platform[]; skipped: Platform[] }>> {
  await requireAdmin();
  const parsed = scheduleContentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { contentId, platforms } = parsed.data;

  const scheduledAt = parseWibInputValue(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return fail("Tanggal tidak valid");
  if (scheduledAt.getTime() < Date.now()) return fail("Waktu jadwal sudah lewat");

  const content = await db.content.findUnique({
    where: { id: contentId },
    select: { id: true, posts: { select: { platform: true, postedAt: true } } },
  });
  if (!content) return fail("Konten tidak ditemukan");

  const posted = new Set(content.posts.filter((p) => p.postedAt).map((p) => p.platform));
  const scheduled = platforms.filter((p) => !posted.has(p));
  const skipped = platforms.filter((p) => posted.has(p));
  if (scheduled.length === 0) {
    return fail(
      `Versi ${skipped.map((p) => PLATFORM_LABELS[p]).join(" & ")} sudah diposting`,
    );
  }

  await db.$transaction(
    scheduled.map((platform) =>
      db.post.upsert({
        where: { contentId_platform: { contentId, platform } },
        update: { scheduledAt },
        create: { contentId, platform, postType: DEFAULT_POST_TYPE[platform], scheduledAt },
      }),
    ),
  );

  revalidatePath(routes.studio.calendar);
  revalidatePath(routes.studio.pipeline, "layout");
  revalidatePath(routes.studio.home);
  return ok({ scheduled, skipped });
}
