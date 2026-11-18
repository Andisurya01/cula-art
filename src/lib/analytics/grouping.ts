// Fungsi murni: median skor per pilar, format, tipe hook, hari, jam, hari+jam (WIB), dan durasi, untuk satu
// platform. `score` boleh berisi skor relatif (aturan saran 4-6 dan AI analisis memakai skor relatif).
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
  /** Durasi video (detik); tanpa durasi → tidak masuk grup durasi. */
  durationSec?: number | null;
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
  /** Kombinasi hari + jam (WIB), kunci `hari-jam` (mis. `6-19` = Sabtu 19.00). Dasar aturan "Jam terbaik". */
  dayHour: GroupRow[];
  /** Kelompok durasi (`durationBucket`). */
  duration: GroupRow[];
};

/** Batas atas (eksklusif, detik) kelompok durasi; terakhir tanpa batas. */
const DURATION_BUCKETS: { key: string; label: string; below: number }[] = [
  { key: "d15", label: "< 15 dtk", below: 15 },
  { key: "d30", label: "15-29 dtk", below: 30 },
  { key: "d60", label: "30-59 dtk", below: 60 },
  { key: "d60+", label: "≥ 60 dtk", below: Number.POSITIVE_INFINITY },
];

/** Kelompok durasi video; tanpa durasi (atau durasi tidak valid) → `null`. */
export function durationBucket(durationSec: number | null | undefined): { key: string; label: string } | null {
  if (durationSec === null || durationSec === undefined || !Number.isFinite(durationSec) || durationSec <= 0) return null;
  const bucket = DURATION_BUCKETS.find((b) => durationSec < b.below)!;
  return { key: bucket.key, label: bucket.label };
}

function wibHour(date: Date): number {
  return Number(toWibTimeString(date).slice(0, 2));
}

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}.00`;

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

/** Hari dan jam mengikuti urutan waktu, bukan peringkat. Kunci `hari-jam` diurutkan hari lalu jam. */
function chronological(rows: GroupRow[]): GroupRow[] {
  const order = (key: string) => key.split("-").reduce((sum, part) => sum * 100 + Number(part), 0);
  return rows.sort((a, b) => order(a.key) - order(b.key));
}

/** Kelompok durasi mengikuti urutan durasi. */
function byDuration(rows: GroupRow[]): GroupRow[] {
  const order = (key: string) => DURATION_BUCKETS.findIndex((b) => b.key === key);
  return rows.sort((a, b) => order(a.key) - order(b.key));
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
        const hour = wibHour(p.postedAt);
        return { key: String(hour), label: hourLabel(hour) };
      }),
    ),
    dayHour: chronological(
      toRows(own, (p) => {
        const day = wibIsoDay(p.postedAt);
        const hour = wibHour(p.postedAt);
        return { key: `${day}-${hour}`, label: `${DAY_LABELS[day]} ${hourLabel(hour)}` };
      }),
    ),
    duration: byDuration(toRows(own, (p) => durationBucket(p.durationSec))),
  };
}
