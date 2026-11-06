// Fungsi murni: median skor per pilar, format, tipe hook, hari, dan jam (WIB), untuk satu platform.
// Tidak boleh import Prisma, React, atau Next.

import { DAY_LABELS, toWibTimeString, wibIsoDay } from "@/lib/date";
import { median, type AnalyticsPlatform } from "./metrics";

/** Grup dengan post kurang dari ini berlabel "data belum cukup" (PRD). */
export const MIN_GROUP_POSTS = 3;

type NamedRef = { id: string; name: string };

export type GroupingPost = {
  platform: AnalyticsPlatform;
  postedAt: Date;
  /** Hanya post yang sudah punya skor yang dikirim ke sini. */
  score: number;
  pillar: NamedRef;
  format: NamedRef | null;
  hookType: NamedRef | null;
};

export type GroupRow = {
  key: string;
  label: string;
  postCount: number;
  medianScore: number;
  /** ≥ 3 post. Grup lain tetap ditampilkan, redup dan berlabel "data belum cukup". */
  enoughData: boolean;
};

export type GroupedScores = {
  pillar: GroupRow[];
  format: GroupRow[];
  hookType: GroupRow[];
  day: GroupRow[];
  hour: GroupRow[];
};

function toRows(
  posts: readonly GroupingPost[],
  keyOf: (post: GroupingPost) => { key: string; label: string } | null,
): GroupRow[] {
  const groups = new Map<string, { label: string; scores: number[] }>();
  for (const post of posts) {
    const ref = keyOf(post);
    if (!ref) continue;
    const group = groups.get(ref.key);
    if (group) group.scores.push(post.score);
    else groups.set(ref.key, { label: ref.label, scores: [post.score] });
  }
  return [...groups.entries()].map(([key, { label, scores }]) => ({
    key,
    label,
    postCount: scores.length,
    medianScore: median(scores),
    enoughData: scores.length >= MIN_GROUP_POSTS,
  }));
}

/** Kategori nama: grup berdata cukup dulu, median tertinggi di atas. */
function ranked(rows: GroupRow[]): GroupRow[] {
  return rows.sort(
    (a, b) =>
      Number(b.enoughData) - Number(a.enoughData) ||
      b.medianScore - a.medianScore ||
      a.label.localeCompare(b.label, "id"),
  );
}

/** Hari dan jam mengikuti urutan waktu, bukan peringkat. */
function chronological(rows: GroupRow[]): GroupRow[] {
  return rows.sort((a, b) => Number(a.key) - Number(b.key));
}

/**
 * Median skor per dimensi untuk SATU platform. Post platform lain diabaikan di sini juga,
 * supaya pemanggil tidak bisa mencampur platform secara tidak sengaja.
 * Post tanpa format atau tipe hook tidak masuk grup dimensi itu.
 */
export function groupScores(posts: readonly GroupingPost[], platform: AnalyticsPlatform): GroupedScores {
  const own = posts.filter((p) => p.platform === platform);
  return {
    pillar: ranked(toRows(own, (p) => ({ key: p.pillar.id, label: p.pillar.name }))),
    format: ranked(toRows(own, (p) => (p.format ? { key: p.format.id, label: p.format.name } : null))),
    hookType: ranked(toRows(own, (p) => (p.hookType ? { key: p.hookType.id, label: p.hookType.name } : null))),
    day: chronological(
      toRows(own, (p) => {
        const day = wibIsoDay(p.postedAt);
        return { key: String(day), label: DAY_LABELS[day] };
      }),
    ),
    hour: chronological(
      toRows(own, (p) => {
        const hour = Number(toWibTimeString(p.postedAt).slice(0, 2));
        return { key: String(hour), label: `${String(hour).padStart(2, "0")}.00` };
      }),
    ),
  };
}
