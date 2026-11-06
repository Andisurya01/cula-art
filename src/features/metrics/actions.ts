"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { wibToUtc } from "@/lib/date";
import { PLATFORMS } from "@/lib/labels";
import { requireAdmin } from "@/features/auth/dal";
import { revalidateMetrics } from "./revalidate";
import { accountSnapshotsSchema, saveMetricSnapshotSchema, snapshotIdSchema } from "./schema";

/**
 * Simpan atau ubah snapshot H+1/H+7 sebuah post. `recordedAt` otomatis (D5): waktu angka ini terakhir
 * disimpan. Satu per post + kind dijaga partial unique index, jadi simpan bersamaan tidak membuat duplikat.
 */
export async function saveMetricSnapshot(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = saveMetricSnapshotSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { postId, kind, ...values } = parsed.data;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { contentId: true, postedAt: true },
  });
  if (!post) return fail("Post tidak ditemukan");
  if (!post.postedAt) return fail("Post belum tayang. Isi waktu posting dulu di detail konten.");

  const data = { ...values, source: "MANUAL" as const, recordedAt: new Date() };
  const updated = await db.metricSnapshot.updateMany({ where: { postId, kind }, data });
  if (updated.count === 0) {
    try {
      await db.metricSnapshot.create({ data: { postId, kind, ...data } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      // Kalah balapan dengan simpan lain: baris sudah ada, jadi cukup diubah.
      await db.metricSnapshot.updateMany({ where: { postId, kind }, data });
    }
  }

  revalidateMetrics(post.contentId);
  return ok();
}

export async function deleteMetricSnapshot(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = snapshotIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const snapshot = await db.metricSnapshot.findUnique({
    where: { id: parsed.data.id },
    select: { post: { select: { contentId: true } } },
  });
  if (!snapshot) return fail("Snapshot tidak ditemukan");

  await db.metricSnapshot.delete({ where: { id: parsed.data.id } });
  revalidateMetrics(snapshot.post.contentId);
  return ok();
}

/** Simpan followers per platform sekaligus. Satu per platform + tanggal: tanggal yang sama menimpa. */
export async function saveAccountSnapshots(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = accountSnapshotsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const date = wibToUtc(parsed.data.date);
  const writes = PLATFORMS.flatMap((platform) => {
    const followers = parsed.data[platform];
    if (followers === null) return [];
    const values = { followers, source: "MANUAL" as const };
    return [
      db.accountSnapshot.upsert({
        where: { platform_date: { platform, date } },
        update: values,
        create: { platform, date, ...values },
      }),
    ];
  });
  await db.$transaction(writes);

  revalidateMetrics();
  return ok();
}

export async function deleteAccountSnapshot(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = snapshotIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await db.accountSnapshot.deleteMany({ where: { id: parsed.data.id } });
  if (result.count === 0) return fail("Snapshot followers tidak ditemukan");

  revalidateMetrics();
  return ok();
}
