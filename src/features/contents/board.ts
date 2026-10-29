// Fungsi murni untuk kanban Pipeline (aman dipakai di client dan server; tanpa Prisma/React).

import type { ContentStage, Platform, PostType } from "@prisma/client";
import { CONTENT_STAGES, PLATFORMS } from "@/lib/labels";

export type CardPost = {
  platform: Platform;
  postType: PostType;
  scheduledAt: Date | null;
  postedAt: Date | null;
  url: string | null;
};

export type PipelineCard = {
  id: string;
  title: string;
  stage: ContentStage;
  stageChangedAt: Date;
  createdAt: Date;
  seriesPart: number | null;
  pillar: { id: string; name: string; color: string };
  format: { id: string; name: string } | null;
  posts: CardPost[];
};

/** Kolom Posted di kanban dibatasi agar ringan. */
export const POSTED_COLUMN_LIMIT = 30;

export type CardSchedule =
  | { kind: "posted"; at: Date }
  | { kind: "upcoming"; at: Date }
  | { kind: "overdue"; at: Date };

/** Post yang memenuhi aturan Posted: punya URL dan waktu posting. */
export function isPublished(post: Pick<CardPost, "url" | "postedAt">): boolean {
  return post.postedAt !== null && !!post.url && post.url.trim() !== "";
}

export function hasPublishedPost(posts: Pick<CardPost, "url" | "postedAt">[]): boolean {
  return posts.some(isPublished);
}

/**
 * Jadwal yang ditampilkan di kartu.
 * - Stage POSTED: waktu posting paling awal.
 * - Lainnya: jadwal terdekat yang akan datang dari versi yang belum diposting;
 *   jika semua jadwal sudah lewat, jadwal terakhir yang terlewat (`overdue`).
 */
export function getCardSchedule(
  stage: ContentStage,
  posts: CardPost[],
  now: Date,
): CardSchedule | null {
  if (stage === "POSTED") {
    const posted = posts
      .map((p) => p.postedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    return posted[0] ? { kind: "posted", at: posted[0] } : null;
  }

  const scheduled = posts
    .filter((p) => p.postedAt === null && p.scheduledAt !== null)
    .map((p) => p.scheduledAt as Date)
    .sort((a, b) => a.getTime() - b.getTime());
  if (scheduled.length === 0) return null;

  const upcoming = scheduled.find((d) => d.getTime() >= now.getTime());
  if (upcoming) return { kind: "upcoming", at: upcoming };
  return { kind: "overdue", at: scheduled[scheduled.length - 1] };
}

/** Platform yang sudah punya versi, urut sesuai `PLATFORMS`. */
export function cardPlatforms(posts: Pick<CardPost, "platform">[]): Platform[] {
  const set = new Set(posts.map((p) => p.platform));
  return PLATFORMS.filter((p) => set.has(p));
}

/**
 * Urutan kartu dalam kolom (tidak disimpan di DB).
 * - Posted: terbaru dipindah lebih dulu.
 * - Lainnya: jadwal terdekat lebih dulu (yang tanpa jadwal di bawah), lalu yang paling lama di kolom.
 */
export function sortColumnCards(cards: PipelineCard[], stage: ContentStage): PipelineCard[] {
  const copy = [...cards];
  if (stage === "POSTED") {
    return copy.sort((a, b) => b.stageChangedAt.getTime() - a.stageChangedAt.getTime());
  }
  const nextScheduled = (card: PipelineCard) => {
    const times = card.posts
      .filter((p) => p.postedAt === null && p.scheduledAt !== null)
      .map((p) => (p.scheduledAt as Date).getTime());
    return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
  };
  return copy.sort((a, b) => {
    const diff = nextScheduled(a) - nextScheduled(b);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return (
      a.stageChangedAt.getTime() - b.stageChangedAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  });
}

/** Kelompokkan kartu per stage (semua stage selalu ada) dan urutkan tiap kolom. */
export function groupCardsByStage(cards: PipelineCard[]): Record<ContentStage, PipelineCard[]> {
  const groups = Object.fromEntries(CONTENT_STAGES.map((s) => [s, [] as PipelineCard[]])) as Record<
    ContentStage,
    PipelineCard[]
  >;
  for (const card of cards) groups[card.stage].push(card);
  for (const stage of CONTENT_STAGES) groups[stage] = sortColumnCards(groups[stage], stage);
  return groups;
}

/** Pindahkan satu kartu ke stage lain (immutable). `stageChangedAt` hanya berubah jika stage berubah. */
export function moveCard(
  cards: PipelineCard[],
  id: string,
  stage: ContentStage,
  at: Date,
): PipelineCard[] {
  return cards.map((card) =>
    card.id === id && card.stage !== stage ? { ...card, stage, stageChangedAt: at } : card,
  );
}

/** Kembalikan stage + `stageChangedAt` satu kartu (rollback optimistic update). */
export function restoreCard(
  cards: PipelineCard[],
  id: string,
  previous: { stage: ContentStage; stageChangedAt: Date },
): PipelineCard[] {
  return cards.map((card) => (card.id === id ? { ...card, ...previous } : card));
}
