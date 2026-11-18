import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { computeSuggestions, type RuleInput, type Suggestion } from "@/lib/analytics/rules";
import { getScoredPosts } from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import { describeSuggestion, type SuggestionView } from "./copy";

/**
 * Masukan mesin aturan dari database dalam satu kali baca (satu `Promise.all`), dipakai Beranda dan
 * Review Mingguan. Skor relatif diambil dari `getScoredPosts` (riwayat penuh per platform, di-cache per
 * request), jadi panggil dengan `now` yang sama dengan halaman supaya tidak dihitung dua kali.
 */
export async function getRuleInput(now: Date): Promise<RuleInput> {
  const [settings, scored, scheduled, contents, projects, pillars, newIdeaCount, dismissals] = await Promise.all([
    getSettings(),
    getScoredPosts(now),
    db.post.findMany({
      where: { postedAt: null, scheduledAt: { not: null } },
      select: { contentId: true, platform: true, scheduledAt: true },
    }),
    // Konten yang belum tayang (ritme, macet) + part seri (lanjutkan seri), cukup field ringkas.
    db.content.findMany({
      where: { OR: [{ stage: { not: "POSTED" } }, { projectId: { not: null }, seriesPart: { not: null } }] },
      select: { id: true, title: true, stage: true, stageChangedAt: true, projectId: true, seriesPart: true },
    }),
    db.project.findMany({ where: { stage: { not: "DONE" } }, select: { id: true, title: true, stage: true } }),
    db.pillar.findMany({ select: { id: true, name: true, targetShare: true, isActive: true, createdAt: true } }),
    db.idea.count({ where: { status: "NEW" } }),
    db.suggestionDismissal.findMany({ where: { until: { gt: now } }, select: { key: true, updatedAt: true } }),
  ]);

  return {
    now,
    weeklyPostTarget: settings.weeklyPostTarget,
    posts: scored.map((p) => ({
      id: p.id,
      contentId: p.contentId,
      title: p.title,
      platform: p.platform,
      postedAt: p.postedAt,
      status: p.status,
      relativeScore: p.relativeScore,
      pillar: { id: p.pillar.id, name: p.pillar.name },
      format: p.format,
      hookType: p.hookType,
    })),
    scheduled: scheduled.map((p) => ({ contentId: p.contentId, platform: p.platform, scheduledAt: p.scheduledAt as Date })),
    contents,
    projects,
    pillars,
    newIdeaCount,
    dismissed: new Set(dismissals.map((d) => d.key)),
    // updatedAt = kapan terakhir disembunyikan (menyembunyikan lagi memperbarui baris yang sama).
    dismissedAt: new Map(dismissals.map((d) => [d.key, d.updatedAt])),
  };
}

/** Semua saran aktif (urut prioritas PRD), satu kali per request untuk `now` yang sama. */
export const getSuggestions = cache(async (now: Date): Promise<Suggestion[]> => {
  return computeSuggestions(await getRuleInput(now));
});

/** Saran siap tampil (judul, kalimat, tautan tindakan); aman dikirim ke client component. */
export async function getSuggestionViews(now: Date): Promise<SuggestionView[]> {
  return (await getSuggestions(now)).map(describeSuggestion);
}
