import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ExperimentResultValue, ExperimentVariant } from "@/lib/analytics/experiments";
import { getScoredPosts } from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import {
  buildExperimentData,
  countByVariant,
  postCandidates,
  toDecidingMetric,
  toExperimentVariable,
  type ExperimentLink,
  type ScoredPostLike,
} from "./derive";
import type { ExperimentStatusFilter } from "./schema";

const experimentSelect = {
  id: true,
  hypothesis: true,
  platform: true,
  variable: true,
  variantA: true,
  variantB: true,
  decidingMetric: true,
  result: true,
  notes: true,
  concludedAt: true,
  createdAt: true,
  posts: {
    select: {
      postId: true,
      variant: true,
      post: { select: { platform: true, content: { select: { title: true } } } },
    },
  },
} satisfies Prisma.ExperimentSelect;

type ExperimentRow = Prisma.ExperimentGetPayload<{ select: typeof experimentSelect }>;

function toLinks(row: ExperimentRow): ExperimentLink[] {
  return row.posts.map((p) => ({
    postId: p.postId,
    variant: p.variant,
    title: p.post.content.title,
    platform: p.post.platform,
  }));
}

function toExperiment(row: ExperimentRow) {
  return {
    id: row.id,
    hypothesis: row.hypothesis,
    platform: row.platform,
    variable: toExperimentVariable(row.variable),
    variantA: row.variantA,
    variantB: row.variantB,
    decidingMetric: toDecidingMetric(row.decidingMetric),
    result: row.result as ExperimentResultValue | null,
    notes: row.notes,
    concludedAt: row.concludedAt,
    createdAt: row.createdAt,
  };
}
export type ExperimentSummary = ReturnType<typeof toExperiment>;

/** Post tayang + bobot skor, sekali per request (`getScoredPosts` di-cache per `now`). */
async function loadScored(now: Date) {
  const [scored, settings] = await Promise.all([getScoredPosts(now), getSettings()]);
  const scoredById = new Map<string, ScoredPostLike>(scored.map((p) => [p.id, p]));
  return { scored, scoredById, weights: settings.scoreWeights };
}

/**
 * Daftar eksperimen: berjalan (`result` null, terbaru dulu) dan selesai (ada hasil, terakhir disimpulkan dulu).
 * Status perbandingan dihitung dari H+7 saja, sama dengan halaman detail.
 */
export async function getExperiments(now: Date = new Date(), filter: ExperimentStatusFilter | null = null) {
  const where: Prisma.ExperimentWhereInput =
    filter === "berjalan" ? { result: null } : filter === "selesai" ? { result: { not: null } } : {};
  const [rows, { scoredById, weights }] = await Promise.all([
    db.experiment.findMany({ where, select: experimentSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
    loadScored(now),
  ]);

  const items = rows.map((row) => {
    const experiment = toExperiment(row);
    const links = toLinks(row);
    const { comparison } = buildExperimentData({
      platform: experiment.platform,
      metric: experiment.decidingMetric,
      weights,
      links,
      scoredById,
    });
    return { ...experiment, counts: countByVariant(links), comparison };
  });

  const running = items.filter((e) => e.result === null);
  const finished = items
    .filter((e) => e.result !== null)
    .sort((a, b) => (b.concludedAt?.getTime() ?? 0) - (a.concludedAt?.getTime() ?? 0));
  return { running, finished };
}
export type ExperimentListItem = Awaited<ReturnType<typeof getExperiments>>["running"][number];

/** Detail satu eksperimen: post per varian, perbandingan (H+7 saja), dan pilihan post. `null` = tidak ada. */
export async function getExperiment(id: string, now: Date = new Date()) {
  const [row, { scored, scoredById, weights }] = await Promise.all([
    db.experiment.findUnique({ where: { id }, select: experimentSelect }),
    loadScored(now),
  ]);
  if (!row) return null;

  const experiment = toExperiment(row);
  const links = toLinks(row);
  const data = buildExperimentData({
    platform: experiment.platform,
    metric: experiment.decidingMetric,
    weights,
    links,
    scoredById,
  });
  return {
    experiment,
    ...data,
    counts: countByVariant(links),
    candidates: postCandidates(scored, experiment.platform, links),
  };
}
export type ExperimentDetail = NonNullable<Awaited<ReturnType<typeof getExperiment>>>;

/** Hipotesis saja (judul tab), tanpa menghitung skor semua post. */
export async function getExperimentHypothesis(id: string): Promise<string | null> {
  const row = await db.experiment.findUnique({ where: { id }, select: { hypothesis: true } });
  return row?.hypothesis ?? null;
}

/** Eksperimen yang memakai satu post (untuk detail post), terbaru dulu. */
export async function getExperimentsForPost(postId: string) {
  const rows = await db.experimentPost.findMany({
    where: { postId },
    select: {
      variant: true,
      experiment: {
        select: { id: true, hypothesis: true, variantA: true, variantB: true, result: true, createdAt: true },
      },
    },
    orderBy: [{ experiment: { createdAt: "desc" } }, { experimentId: "asc" }],
  });
  return rows.map(({ variant, experiment }) => ({
    id: experiment.id,
    hypothesis: experiment.hypothesis,
    variant: variant as ExperimentVariant,
    /** Deskripsi varian tempat post ini berada. */
    variantDescription: variant === "A" ? experiment.variantA : experiment.variantB,
    result: experiment.result as ExperimentResultValue | null,
  }));
}
export type PostExperiment = Awaited<ReturnType<typeof getExperimentsForPost>>[number];
