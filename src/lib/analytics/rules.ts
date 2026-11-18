// Fungsi murni: mesin aturan saran (PRD "Aturan saran otomatis", tafsiran E1-E6 di docs/FASE-5.md).
// Dihitung saat halaman dibuka, tanpa background job. Tidak boleh import Prisma, React, atau Next.
//
// - Output terurut prioritas PRD (1 = Ritme terancam … 10 = Ide menipis), lalu platform.
// - Aturan berbasis data (4-8) memakai skor relatif, hanya grup ≥ 3 post, dan dihitung per platform.
// - Satu saran per aturan per platform. Setiap saran punya kunci stabil `aturan:platform:subjek`
//   (platform "-" jika tidak per platform) untuk "Sembunyikan 7 hari" (E6).
// - Teks saran tidak dibuat di sini (lihat src/features/suggestions/copy.ts); output berisi angka jadi.

import { addWibDays, endOfWibWeek, isStale, startOfWibWeek, toWibDateString, wibIsoDay } from "@/lib/date";
import { groupScores, MIN_GROUP_POSTS, type GroupedScores, type GroupingPost, type GroupRow } from "./grouping";
import type { AnalyticsPlatform } from "./metrics";
import type { MetricStatus } from "./snapshots";
import type { ContentStageValue } from "./tasks";

export const RULE_IDS = [
  "rhythm",
  "pending-metrics",
  "stale-content",
  "best-pillar",
  "best-hook",
  "best-time",
  "continue-series",
  "crosspost",
  "neglected-pillar",
  "low-ideas",
] as const;
export type RuleId = (typeof RULE_IDS)[number];

/** Urutan prioritas PRD (1 = paling penting). */
export const RULE_PRIORITY: Record<RuleId, number> = Object.fromEntries(
  RULE_IDS.map((rule, i) => [rule, i + 1]),
) as Record<RuleId, number>;

const PLATFORM_ORDER: readonly AnalyticsPlatform[] = ["TIKTOK", "INSTAGRAM"];

/** E1: "unggul" = median skor relatif ≥ 1,2 (≥ 20% di atas biasanya). */
export const STRONG_RELATIVE_SCORE = 1.2;
/** E3: part terakhir seri dianggap di atas biasanya jika skor relatifnya ≥ 1. */
export const SERIES_MIN_RELATIVE_SCORE = 1;
/** E4: crosspost hanya untuk konten yang tayang paling lama sekian hari lalu. */
export const CROSSPOST_WINDOW_DAYS = 30;
/** E5: pilar tanpa post tayang selama sekian hari. */
export const NEGLECTED_PILLAR_DAYS = 14;
/** E5: aturan pilar terabaikan baru aktif jika konten tayang sudah sebanyak ini. */
export const NEGLECTED_PILLAR_MIN_POSTS = 3;
/** E2: ritme terancam aktif mulai hari ISO ini (4 = Kamis) WIB. */
export const RHYTHM_FROM_ISO_DAY = 4;
/** E2: maks. konten Siap Posting yang disebut. */
export const RHYTHM_READY_LIMIT = 2;
/** PRD menu 2: ide Baru kurang dari ini → "bank ide menipis" (sama dengan IDEA_BANK_LOW_THRESHOLD). */
export const LOW_IDEAS_THRESHOLD = 5;
/** E6: lama "Sembunyikan". */
export const SUGGESTION_HIDE_DAYS = 7;

const DAY_MS = 86_400_000;

export type ProjectStageValue = "PLANNING" | "IN_PROGRESS" | "DONE" | "PAUSED";
type NamedRef = { id: string; name: string };

/** Post tayang (hasil getScoredPosts): status metrik dan skor relatif sudah dihitung. */
export type RulePost = {
  id: string;
  contentId: string;
  title: string;
  platform: AnalyticsPlatform;
  postedAt: Date;
  status: MetricStatus;
  /** `null` = belum bisa dibandingkan (pembanding < 3, median 0, atau belum ada snapshot). */
  relativeScore: number | null;
  pillar: NamedRef;
  format: NamedRef | null;
  hookType: NamedRef | null;
};

/** Versi platform yang terjadwal dan belum tayang (`postedAt` null). */
export type RuleScheduledPost = { contentId: string; platform: AnalyticsPlatform; scheduledAt: Date };

export type RuleContent = {
  id: string;
  title: string;
  stage: ContentStageValue;
  stageChangedAt: Date;
  projectId: string | null;
  seriesPart: number | null;
};

export type RuleProject = { id: string; title: string; stage: ProjectStageValue };

export type RulePillar = { id: string; name: string; targetShare: number; isActive: boolean; createdAt: Date };

export type RuleInput = {
  now: Date;
  weeklyPostTarget: number;
  /** Semua post tayang, semua platform. */
  posts: readonly RulePost[];
  /** Semua versi terjadwal yang belum tayang. */
  scheduled: readonly RuleScheduledPost[];
  /** Semua konten (cukup field di atas). */
  contents: readonly RuleContent[];
  projects: readonly RuleProject[];
  pillars: readonly RulePillar[];
  newIdeaCount: number;
  /** Kunci saran yang sedang disembunyikan (`until` > now). */
  dismissed: ReadonlySet<string>;
  /**
   * Kapan kunci itu terakhir disembunyikan. Dipakai saran yang muncul lagi jika ada hal baru setelahnya
   * (Metrik tertunda: post yang baru jatuh tempo). Tanpa waktu → tetap tersembunyi sampai `until`.
   */
  dismissedAt?: ReadonlyMap<string, Date>;
};

export type ContentRef = { id: string; title: string };
export type GroupWinner = Pick<GroupRow, "key" | "label" | "postCount" | "medianScore">;

export type SuggestionDetail =
  | {
      rule: "rhythm";
      weekStart: Date;
      target: number;
      /** Konten tayang + terjadwal minggu ini (per konten). */
      planned: number;
      missing: number;
      /** Maks. 2 konten Siap Posting yang belum terjadwal. */
      ready: ContentRef[];
    }
  | { rule: "pending-metrics"; needH1: number; needH7: number }
  | {
      rule: "stale-content";
      content: ContentRef & { stage: ContentStageValue };
      days: number;
      /** Konten macet lain yang tidak disembunyikan. */
      others: number;
    }
  | { rule: "best-pillar" | "best-hook" | "best-time"; group: GroupWinner }
  | {
      rule: "continue-series";
      project: ContentRef;
      /** Nomor part tayang terakhir di platform ini. */
      part: number;
      relativeScore: number;
      nextPart: number;
      /** Konten part berikutnya jika sudah ada (belum tayang dan belum terjadwal). */
      nextContent: (ContentRef & { stage: ContentStageValue }) | null;
    }
  | { rule: "crosspost"; content: ContentRef; relativeScore: number; missingPlatform: AnalyticsPlatform }
  | {
      rule: "neglected-pillar";
      pillar: NamedRef & { targetShare: number };
      /** Post tayang terakhir pilar ini; `null` = belum pernah. */
      lastPostedAt: Date | null;
      others: number;
    }
  | { rule: "low-ideas"; count: number; threshold: number };

export type Suggestion = SuggestionDetail & {
  key: string;
  priority: number;
  /** `null` = saran tidak per platform (ritme, macet, pilar terabaikan, ide). */
  platform: AnalyticsPlatform | null;
};

/** Kunci stabil sebuah saran: `aturan:platform:subjek`. */
export function suggestionKey(rule: RuleId, platform: AnalyticsPlatform | null, subject: string): string {
  return `${rule}:${platform ?? "-"}:${subject}`;
}

/** Pola kunci yang sah (dipakai validasi aksi "Sembunyikan"). */
export const SUGGESTION_KEY_PATTERN = /^[a-z-]+:(?:TIKTOK|INSTAGRAM|-):[A-Za-z0-9._-]+$/;

type Candidate = {
  platform: AnalyticsPlatform | null;
  subject: string;
  detail: SuggestionDetail;
  /** Saran yang disembunyikan muncul lagi jika ada hal baru setelah disembunyikan (waktu terbaru hal itu). */
  freshAt?: Date;
};

function build(input: RuleInput, candidate: Candidate): Suggestion {
  const rule = candidate.detail.rule;
  return {
    ...candidate.detail,
    key: suggestionKey(rule, candidate.platform, candidate.subject),
    priority: RULE_PRIORITY[rule],
    platform: candidate.platform,
  };
}

const isDismissed = (input: RuleInput, rule: RuleId, platform: AnalyticsPlatform | null, subject: string) =>
  input.dismissed.has(suggestionKey(rule, platform, subject));

// ---- 1. Ritme terancam (E2) -------------------------------------------------------------------------

function rhythm(input: RuleInput): Candidate[] {
  const { now, weeklyPostTarget: target } = input;
  if (target <= 0 || wibIsoDay(now) < RHYTHM_FROM_ISO_DAY) return [];
  const weekStart = startOfWibWeek(now);
  const weekEnd = endOfWibWeek(now);
  const inWeek = (at: Date) => at >= weekStart && at < weekEnd;

  // Per konten, sama dengan kartu Beranda: tayang minggu ini, atau terjadwal minggu ini dan belum tayang.
  const planned = new Set<string>();
  for (const post of input.posts) if (inWeek(post.postedAt)) planned.add(post.contentId);
  for (const post of input.scheduled) if (inWeek(post.scheduledAt)) planned.add(post.contentId);
  if (planned.size >= target) return [];

  const futureScheduled = new Set(input.scheduled.filter((p) => p.scheduledAt >= now).map((p) => p.contentId));
  const ready = input.contents
    .filter((c) => c.stage === "READY" && !planned.has(c.id) && !futureScheduled.has(c.id))
    .sort((a, b) => a.stageChangedAt.getTime() - b.stageChangedAt.getTime() || a.id.localeCompare(b.id))
    .slice(0, RHYTHM_READY_LIMIT)
    .map(({ id, title }) => ({ id, title }));

  return [
    {
      platform: null,
      subject: toWibDateString(weekStart),
      detail: { rule: "rhythm", weekStart, target, planned: planned.size, missing: target - planned.size, ready },
    },
  ];
}

// ---- 2. Metrik tertunda -----------------------------------------------------------------------------

/** Saat metrik post jatuh tempo: H+1 sehari setelah tayang, H+7 tujuh hari setelah tayang. */
function dueAt(post: RulePost): number {
  return post.postedAt.getTime() + (post.status === "NEED_H1" ? DAY_MS : 7 * DAY_MS);
}

function pendingMetrics(input: RuleInput): Candidate[] {
  return PLATFORM_ORDER.flatMap((platform) => {
    const due = input.posts.filter(
      (p) => p.platform === platform && (p.status === "NEED_H1" || p.status === "NEED_H7"),
    );
    if (due.length === 0) return [];
    // Subjek tetap per platform. Setelah disembunyikan, saran muncul lagi hanya jika ada post yang jatuh
    // tempo setelah waktu disembunyikan (mengisi sebagian metrik tidak memunculkannya lagi).
    return [
      {
        platform,
        subject: "tertunda",
        freshAt: new Date(Math.max(...due.map(dueAt))),
        detail: {
          rule: "pending-metrics",
          needH1: due.filter((p) => p.status === "NEED_H1").length,
          needH7: due.filter((p) => p.status === "NEED_H7").length,
        },
      },
    ];
  });
}

// ---- 3. Pipeline macet ------------------------------------------------------------------------------

function staleContent(input: RuleInput): Candidate[] {
  const stale = input.contents
    .filter((c) => c.stage !== "POSTED" && isStale(c.stageChangedAt, input.now))
    .sort((a, b) => a.stageChangedAt.getTime() - b.stageChangedAt.getTime() || a.id.localeCompare(b.id))
    .filter((c) => !isDismissed(input, "stale-content", null, `${c.id}.${c.stage}`));
  const first = stale[0];
  if (!first) return [];
  return [
    {
      platform: null,
      subject: `${first.id}.${first.stage}`,
      detail: {
        rule: "stale-content",
        content: { id: first.id, title: first.title, stage: first.stage },
        days: Math.floor((input.now.getTime() - first.stageChangedAt.getTime()) / DAY_MS),
        others: stale.length - 1,
      },
    },
  ];
}

// ---- 4-6. Pilar, hook, dan hari+jam terbaik (E1) ----------------------------------------------------

/** Post berskor relatif, dalam bentuk masukan `groupScores` (skor = skor relatif). */
function relativeGroupingPosts(posts: readonly RulePost[]): GroupingPost[] {
  return posts.flatMap((p) =>
    p.relativeScore === null
      ? []
      : [
          {
            platform: p.platform,
            postedAt: p.postedAt,
            score: p.relativeScore,
            pillar: p.pillar,
            format: p.format,
            hookType: p.hookType,
          },
        ],
  );
}

/** Grup unggul: ≥ 3 post dan median ≥ 1,2; median tertinggi, lalu post terbanyak. */
export function strongestGroup(rows: readonly GroupRow[]): GroupWinner | null {
  const winner = rows
    .filter((r) => r.enoughData && r.postCount >= MIN_GROUP_POSTS && r.medianScore >= STRONG_RELATIVE_SCORE)
    .sort(
      (a, b) =>
        b.medianScore - a.medianScore || b.postCount - a.postCount || a.label.localeCompare(b.label, "id"),
    )[0];
  return winner ? { key: winner.key, label: winner.label, postCount: winner.postCount, medianScore: winner.medianScore } : null;
}

const BEST_RULES: { rule: "best-pillar" | "best-hook" | "best-time"; dimension: keyof GroupedScores }[] = [
  { rule: "best-pillar", dimension: "pillar" },
  { rule: "best-hook", dimension: "hookType" },
  { rule: "best-time", dimension: "dayHour" },
];

function bestGroups(input: RuleInput): Candidate[][] {
  const grouping = relativeGroupingPosts(input.posts);
  const grouped = PLATFORM_ORDER.map((platform) => ({ platform, groups: groupScores(grouping, platform) }));
  return BEST_RULES.map(({ rule, dimension }) =>
    grouped.flatMap(({ platform, groups }) => {
      const group = strongestGroup(groups[dimension]);
      // Pemenang yang disembunyikan tidak digantikan juara dua: itu bukan lagi "terbaik".
      return group ? [{ platform, subject: group.key, detail: { rule, group } }] : [];
    }),
  );
}

// ---- 7. Lanjutkan seri (E3) -------------------------------------------------------------------------

function continueSeries(input: RuleInput): Candidate[] {
  const postsByContent = new Map<string, RulePost[]>();
  for (const post of input.posts) {
    const list = postsByContent.get(post.contentId);
    if (list) list.push(post);
    else postsByContent.set(post.contentId, [post]);
  }
  const scheduledContents = new Set(input.scheduled.map((p) => p.contentId));
  const started = (contentId: string) => postsByContent.has(contentId) || scheduledContents.has(contentId);

  type SeriesCandidate = Candidate & { relativeScore: number };
  const perProject: SeriesCandidate[] = [];

  for (const project of input.projects) {
    if (project.stage === "DONE") continue;
    const parts = input.contents
      .filter((c) => c.projectId === project.id && c.seriesPart !== null)
      .sort((a, b) => a.seriesPart! - b.seriesPart! || a.id.localeCompare(b.id));
    if (parts.length === 0) continue;

    let best: SeriesCandidate | null = null;
    // Satu proyek tampil sekali di platform terkuatnya; menyembunyikannya (di platform mana pun) tidak boleh
    // membuat proyek yang sama muncul lagi di platform lain.
    let hidden = false;
    for (const platform of PLATFORM_ORDER) {
      // Part tayang terakhir di platform ini (nomor part tertinggi yang punya post tayang di platform ini).
      const last = [...parts]
        .reverse()
        .map((content) => ({ content, post: postsByContent.get(content.id)?.find((p) => p.platform === platform) }))
        .find((x) => x.post !== undefined);
      if (!last?.post || last.post.relativeScore === null || last.post.relativeScore < SERIES_MIN_RELATIVE_SCORE) continue;
      const part = last.content.seriesPart!;
      const later = parts.filter((c) => c.seriesPart! > part);
      // Part berikutnya sudah tayang atau terjadwal (di platform mana pun): seri sudah berlanjut.
      if (later.some((c) => started(c.id))) continue;
      const next = later[0] ?? null;
      const subject = `${project.id}.${part}`;
      if (PLATFORM_ORDER.some((p) => isDismissed(input, "continue-series", p, `${project.id}.${part}`))) hidden = true;
      const candidate: SeriesCandidate = {
        platform,
        subject,
        relativeScore: last.post.relativeScore,
        detail: {
          rule: "continue-series",
          project: { id: project.id, title: project.title },
          part,
          relativeScore: last.post.relativeScore,
          nextPart: next?.seriesPart ?? part + 1,
          nextContent: next && { id: next.id, title: next.title, stage: next.stage },
        },
      };
      if (!best || candidate.relativeScore > best.relativeScore) best = candidate;
    }
    if (best && !hidden) perProject.push(best);
  }

  // Satu proyek hanya muncul sekali (platform terkuatnya); satu saran per platform.
  return PLATFORM_ORDER.flatMap((platform) => {
    const top = perProject
      .filter((c) => c.platform === platform)
      .sort((a, b) => b.relativeScore - a.relativeScore || a.subject.localeCompare(b.subject))[0];
    return top ? [{ platform: top.platform, subject: top.subject, detail: top.detail }] : [];
  });
}

// ---- 8. Crosspost tertinggal (E4) -------------------------------------------------------------------

function crosspost(input: RuleInput): Candidate[] {
  const since = input.now.getTime() - CROSSPOST_WINDOW_DAYS * DAY_MS;
  const started = new Set<string>(); // `${contentId}:${platform}` yang sudah tayang atau terjadwal
  for (const post of input.posts) started.add(`${post.contentId}:${post.platform}`);
  for (const post of input.scheduled) started.add(`${post.contentId}:${post.platform}`);

  return PLATFORM_ORDER.flatMap((platform) => {
    const missingPlatform = PLATFORM_ORDER.find((p) => p !== platform)!;
    const top = input.posts
      .filter(
        (p) =>
          p.platform === platform &&
          p.relativeScore !== null &&
          p.relativeScore >= STRONG_RELATIVE_SCORE &&
          p.postedAt.getTime() >= since &&
          p.postedAt.getTime() <= input.now.getTime() &&
          !started.has(`${p.contentId}:${missingPlatform}`) &&
          !isDismissed(input, "crosspost", platform, p.contentId),
      )
      .sort((a, b) => b.relativeScore! - a.relativeScore! || a.id.localeCompare(b.id))[0];
    return top
      ? [
          {
            platform,
            subject: top.contentId,
            detail: {
              rule: "crosspost",
              content: { id: top.contentId, title: top.title },
              relativeScore: top.relativeScore!,
              missingPlatform,
            },
          },
        ]
      : [];
  });
}

// ---- 9. Pilar terabaikan (E5) -----------------------------------------------------------------------

function neglectedPillar(input: RuleInput): Candidate[] {
  const postedContents = new Set(input.posts.filter((p) => p.postedAt <= input.now).map((p) => p.contentId));
  if (postedContents.size < NEGLECTED_PILLAR_MIN_POSTS) return [];
  const since = addWibDays(input.now, -NEGLECTED_PILLAR_DAYS);

  const lastPosted = new Map<string, Date>();
  for (const post of input.posts) {
    if (post.postedAt > input.now) continue;
    const prev = lastPosted.get(post.pillar.id);
    if (!prev || post.postedAt > prev) lastPosted.set(post.pillar.id, post.postedAt);
  }

  const neglected = input.pillars
    // Pilar yang baru dibuat (< 14 hari) belum bisa dibilang terabaikan.
    .filter((p) => p.isActive && p.targetShare > 0 && p.createdAt <= since)
    .map((pillar) => ({ pillar, last: lastPosted.get(pillar.id) ?? null }))
    .filter(({ last }) => !last || last < since)
    .sort(
      (a, b) =>
        b.pillar.targetShare - a.pillar.targetShare ||
        (a.last?.getTime() ?? 0) - (b.last?.getTime() ?? 0) ||
        a.pillar.name.localeCompare(b.pillar.name, "id"),
    )
    .filter(({ pillar }) => !isDismissed(input, "neglected-pillar", null, pillar.id));
  const first = neglected[0];
  if (!first) return [];
  return [
    {
      platform: null,
      subject: first.pillar.id,
      detail: {
        rule: "neglected-pillar",
        pillar: { id: first.pillar.id, name: first.pillar.name, targetShare: first.pillar.targetShare },
        lastPostedAt: first.last,
        others: neglected.length - 1,
      },
    },
  ];
}

// ---- 10. Ide menipis --------------------------------------------------------------------------------

function lowIdeas(input: RuleInput): Candidate[] {
  if (input.newIdeaCount >= LOW_IDEAS_THRESHOLD) return [];
  return [
    {
      platform: null,
      subject: "ide",
      detail: { rule: "low-ideas", count: input.newIdeaCount, threshold: LOW_IDEAS_THRESHOLD },
    },
  ];
}

/**
 * Semua saran aktif, terurut prioritas PRD lalu platform (TikTok, Instagram). Saran yang kuncinya
 * disembunyikan tidak ikut. Untuk aturan yang punya beberapa subjek (macet, seri, crosspost, pilar
 * terabaikan), subjek berikutnya yang tidak disembunyikan yang tampil; untuk "terbaik" tidak.
 */
export function computeSuggestions(input: RuleInput): Suggestion[] {
  const [bestPillar, bestHook, bestTime] = bestGroups(input);
  const candidates = [
    ...rhythm(input),
    ...pendingMetrics(input),
    ...staleContent(input),
    ...bestPillar!,
    ...bestHook!,
    ...bestTime!,
    ...continueSeries(input),
    ...crosspost(input),
    ...neglectedPillar(input),
    ...lowIdeas(input),
  ];
  const platformRank = (p: AnalyticsPlatform | null) => (p === null ? -1 : PLATFORM_ORDER.indexOf(p));
  const visible = candidates.filter((c) => {
    const key = suggestionKey(c.detail.rule, c.platform, c.subject);
    if (!input.dismissed.has(key)) return true;
    const dismissedAt = input.dismissedAt?.get(key);
    return Boolean(c.freshAt && dismissedAt && c.freshAt > dismissedAt);
  });
  return visible
    .map((c) => build(input, c))
    .sort((a, b) => a.priority - b.priority || platformRank(a.platform) - platformRank(b.platform));
}

/** Batas "Sembunyikan 7 hari" dari sekarang. */
export function dismissUntil(now: Date): Date {
  return addWibDays(now, SUGGESTION_HIDE_DAYS);
}
