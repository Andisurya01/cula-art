import "server-only";
import { db } from "@/lib/db";
import { startOfWibDay, startOfWibMonth } from "@/lib/date";
import { AI_MESSAGES } from "./errors";
import type { AiFeature, AiTargetType } from "./features";
import { AI_GUIDE_ID } from "./queries";

// Cek batas + reservasi baris AiRun RUNNING dalam satu transaksi. Advisory lock membuat cek dan reservasi
// berurutan, jadi panggilan bersamaan tidak bisa sama-sama lolos dengan sisa satu slot. Baris RUNNING
// membawa biaya terburuk sampai selesai, sehingga panggilan yang sedang berjalan ikut terhitung di batas
// bulanan.

const AI_LIMIT_LOCK_KEY = 730_103; // angka tetap, khusus kunci batas AI

/** RUNNING lebih lama dari ini dianggap tertinggal (server berhenti di tengah panggilan). */
export const STALE_RUN_MS = 15 * 60 * 1000;
export const STALE_RUN_MESSAGE = "Terputus: server berhenti sebelum panggilan selesai (biaya diperkirakan).";

export type ReserveArgs = {
  feature: AiFeature;
  model: string;
  promptVersion: string;
  targetType: AiTargetType;
  targetId: string | null;
  /** Biaya terburuk (US$) yang dipesan sampai biaya sebenarnya tercatat. */
  costUsd: number;
};

export type ReserveResult = { ok: true; runId: string } | { ok: false; error: string };

export async function reserveAiRun(
  args: ReserveArgs,
  options: { requireEnabled?: boolean; now?: Date } = {},
): Promise<ReserveResult> {
  const now = options.now ?? new Date();
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AI_LIMIT_LOCK_KEY})`;
    // Rapikan run tertinggal: tetap dihitung (biaya pesanan dipertahankan), tetapi tidak tampil "berjalan".
    await tx.aiRun.updateMany({
      where: { status: "RUNNING", createdAt: { lt: new Date(now.getTime() - STALE_RUN_MS) } },
      data: { status: "ERROR", errorMessage: STALE_RUN_MESSAGE },
    });

    const guide = await tx.aiGuide.upsert({ where: { id: AI_GUIDE_ID }, update: {}, create: { id: AI_GUIDE_ID } });
    if ((options.requireEnabled ?? true) && !guide.isEnabled) return { ok: false, error: AI_MESSAGES.disabled };

    const [callsToday, month] = await Promise.all([
      tx.aiRun.count({ where: { createdAt: { gte: startOfWibDay(now) } } }),
      tx.aiRun.aggregate({ where: { createdAt: { gte: startOfWibMonth(now) } }, _sum: { costUsd: true } }),
    ]);
    if (callsToday >= guide.dailyCallLimit) {
      return { ok: false, error: AI_MESSAGES.dailyLimit(guide.dailyCallLimit) };
    }
    if ((month._sum.costUsd ?? 0) >= guide.monthlyBudgetUsd) {
      return { ok: false, error: AI_MESSAGES.monthlyBudget(guide.monthlyBudgetUsd) };
    }

    const run = await tx.aiRun.create({ data: { ...args, status: "RUNNING", createdAt: now }, select: { id: true } });
    return { ok: true, runId: run.id };
  });
}
