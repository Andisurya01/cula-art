// Fungsi murni Eksperimen: menyusun masukan `compareExperiment` dari post tersimpan, daftar pilihan post,
// dan pencarian judul. Tanpa Prisma/React/Next, jadi aman di client dan server (dan mudah di-test).

import type { Platform } from "@prisma/client";
import {
  compareExperiment,
  DECIDING_METRICS,
  EXPERIMENT_VARIABLES,
  metricValue,
  type DecidingMetric,
  type ExperimentComparison,
  type ExperimentPostInput,
  type ExperimentVariable,
  type ExperimentVariant,
} from "@/lib/analytics/experiments";
import type { MetricInput, ScoreWeights } from "@/lib/analytics/metrics";
import type { MetricStatus, SnapshotKindValue } from "@/lib/analytics/snapshots";

/** Kolom String di database → nilai yang dikenal. Nilai asing (diedit manual) jatuh ke cadangan. */
export function toExperimentVariable(value: string): ExperimentVariable {
  return EXPERIMENT_VARIABLES.find((v) => v === value) ?? "OTHER";
}

export function toDecidingMetric(value: string): DecidingMetric {
  return DECIDING_METRICS.find((m) => m === value) ?? "SCORE";
}

type SnapshotLike = MetricInput & { kind: SnapshotKindValue };

/** Angka snapshot H+7 saja (H+1 tidak dipakai untuk perbandingan eksperimen). */
export function h7Metrics(snapshots: readonly SnapshotLike[]): MetricInput | null {
  const h7 = snapshots.find((s) => s.kind === "H7");
  if (!h7) return null;
  return {
    views: h7.views,
    likes: h7.likes,
    comments: h7.comments,
    shares: h7.shares,
    saves: h7.saves,
    follows: h7.follows,
  };
}

/** Post tayang dari `getScoredPosts` (cukup field yang dipakai di sini). */
export type ScoredPostLike = {
  id: string;
  title: string;
  platform: Platform;
  postedAt: Date;
  url: string | null;
  status: MetricStatus;
  snapshots: readonly SnapshotLike[];
};

/** Baris `ExperimentPost` + judul dan platform post dari database (post bisa sudah tidak tayang). */
export type ExperimentLink = {
  postId: string;
  variant: ExperimentVariant;
  title: string;
  platform: Platform;
};

export type VariantPost = {
  postId: string;
  variant: ExperimentVariant;
  title: string;
  platform: Platform;
  /** `null` = post sudah tidak tayang (waktu posting dihapus); tidak ikut perbandingan. */
  postedAt: Date | null;
  status: MetricStatus | null;
  url: string | null;
  /** Nilai metrik penentu dari H+7; `null` = H+7 belum diisi. */
  value: number | null;
  /** Ada H+1 tetapi belum H+7 (tampil "menunggu H+7"). */
  h1Only: boolean;
};

export type ExperimentData = {
  posts: VariantPost[];
  comparison: ExperimentComparison;
  /** Post tersimpan yang sudah tidak tayang atau beda platform; tidak ikut perbandingan. */
  excludedCount: number;
};

/**
 * Post per varian + perbandingan dari angka H+7 saja. Urutan post: varian A dulu, lalu tayang terbaru.
 * Post yang sudah tidak tayang ditampilkan tetapi tidak ikut perbandingan, supaya eksperimen tidak
 * menunggu H+7 selamanya.
 */
export function buildExperimentData(input: {
  platform: Platform;
  metric: DecidingMetric;
  weights: ScoreWeights;
  links: readonly ExperimentLink[];
  scoredById: ReadonlyMap<string, ScoredPostLike>;
}): ExperimentData {
  const posts: VariantPost[] = input.links.map((link) => {
    const scored = input.scoredById.get(link.postId);
    const h7 = scored ? h7Metrics(scored.snapshots) : null;
    return {
      postId: link.postId,
      variant: link.variant,
      title: scored?.title ?? link.title,
      platform: link.platform,
      postedAt: scored?.postedAt ?? null,
      status: scored?.status ?? null,
      url: scored?.url ?? null,
      value: h7 ? metricValue(input.metric, h7, input.weights) : null,
      h1Only: !h7 && !!scored?.snapshots.some((s) => s.kind === "H1"),
    };
  });
  posts.sort(
    (a, b) =>
      a.variant.localeCompare(b.variant) ||
      (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0) ||
      a.postId.localeCompare(b.postId),
  );

  const included: ExperimentPostInput[] = [];
  for (const post of posts) {
    const scored = input.scoredById.get(post.postId);
    if (!scored || scored.platform !== input.platform) continue;
    included.push({
      postId: post.postId,
      platform: scored.platform,
      variant: post.variant,
      h7: h7Metrics(scored.snapshots),
    });
  }

  return {
    posts,
    comparison: compareExperiment({
      platform: input.platform,
      metric: input.metric,
      posts: included,
      weights: input.weights,
    }),
    excludedCount: posts.length - included.length,
  };
}

export type PostCandidate = {
  id: string;
  title: string;
  postedAt: Date;
  status: MetricStatus;
  /** Varian post ini di eksperimen yang sedang dibuka; `null` = belum masuk. */
  variant: ExperimentVariant | null;
};

/** Pilihan post: tayang di platform eksperimen, terbaru dulu (urutan `getScoredPosts` dipertahankan). */
export function postCandidates(
  scored: readonly ScoredPostLike[],
  platform: Platform,
  links: readonly Pick<ExperimentLink, "postId" | "variant">[],
): PostCandidate[] {
  const variants = new Map(links.map((l) => [l.postId, l.variant]));
  return scored
    .filter((p) => p.platform === platform)
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .map((p) => ({
      id: p.id,
      title: p.title,
      postedAt: p.postedAt,
      status: p.status,
      variant: variants.get(p.id) ?? null,
    }));
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("id")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cari judul (tanpa beda huruf besar/kecil dan aksen; semua kata harus ada). Hasil dibatasi `limit`. */
export function searchCandidates<T extends { title: string }>(
  candidates: readonly T[],
  query: string,
  limit = 50,
): { items: T[]; total: number } {
  const words = normalize(query).split(" ").filter(Boolean);
  const matches = words.length
    ? candidates.filter((c) => {
        const title = normalize(c.title);
        return words.every((w) => title.includes(w));
      })
    : [...candidates];
  return { items: matches.slice(0, Math.max(0, limit)), total: matches.length };
}

/** Jumlah post per varian. */
export function countByVariant(links: readonly { variant: ExperimentVariant }[]): Record<ExperimentVariant, number> {
  const counts: Record<ExperimentVariant, number> = { A: 0, B: 0 };
  for (const link of links) counts[link.variant] += 1;
  return counts;
}
