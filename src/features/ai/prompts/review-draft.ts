import { z } from "zod";
import { isValidWibDateString } from "@/lib/date";
import { ANALYSIS_RULES, fmt, groupLine, NOT_ENOUGH_DATA, type GroupStat } from "./analysis-common";
import { dataLines, excerpt, notesSchema, type FeaturePrompt } from "./types";

// Review Mingguan → "Draf ringkasan": narasi dari ringkasan angka minggu itu + draf refleksi dan 3 usulan
// fokus minggu depan. Hasil hanya mengisi form review; tersimpan setelah pengguna menekan Simpan (E9).

/** Batas field refleksi di form Review Mingguan (sama dengan schema features/reviews). */
export const REVIEW_TEXT_MAX = 2000;
export const REVIEW_FOCUS_COUNT = 3;

const formText = z.string().max(REVIEW_TEXT_MAX * 2).nullable().optional();

export const reviewDraftInput = z.object({
  /** Senin minggu yang di-review, `yyyy-MM-dd` WIB. */
  weekStart: z.string().refine(isValidWibDateString, "Minggu tidak valid"),
  wins: formText,
  repeat: formText,
  stop: formText,
  focusNext: formText,
});
export type ReviewDraftInput = z.output<typeof reviewDraftInput>;

export type ReviewPostLine = {
  title: string;
  /** `null` = belum bisa dibandingkan (belum ada metrik atau pembanding < 3). */
  relativeScore: number | null;
  pillar: string;
  format: string | null;
  hookType: string | null;
  /** Hari + jam tayang WIB, mis. "Sabtu 19.10". */
  postedAt: string;
};

export type ReviewPlatformContext = {
  platform: string;
  viewsLabel: string;
  postCount: number;
  followersGained: number | null;
  followersEnd: number | null;
  best: { title: string; relativeScore: number } | null;
  worst: { title: string; relativeScore: number } | null;
  posts: ReviewPostLine[];
  /** Median skor relatif per pilar/format/hook/jam dari semua post sampai akhir minggu ini. */
  groups: GroupStat[];
  /** Post platform ini yang punya skor relatif sampai akhir minggu ini. */
  scoredTotal: number;
};

export type ReviewDraftContext = {
  /** Mis. "9-15 November 2026". */
  weekLabel: string;
  target: number;
  /** Konten tayang minggu ini (TikTok + Instagram dari konten yang sama = 1). */
  postedCount: number;
  platforms: ReviewPlatformContext[];
  /** Saran aturan yang sedang aktif (teks jadi). */
  suggestions: string[];
  /** Isi form saat ini (boleh kosong), supaya draf melanjutkan tulisan kreator. */
  current: { wins: string | null; repeat: string | null; stop: string | null; focusNext: string | null };
};

export type ReviewDraftOutput = {
  narrative: string;
  wins: string;
  repeat: string;
  stop: string;
  focusNext: string[];
  notes: string | null;
};

function platformBlock(p: ReviewPlatformContext): string {
  const ref = (x: { title: string; relativeScore: number } | null) => (x ? `${x.title} (${fmt.relative(x.relativeScore)})` : "—");
  const followers =
    p.followersGained === null
      ? `belum bisa dihitung (snapshot followers kurang)${p.followersEnd !== null ? `; followers terakhir ${fmt.count(p.followersEnd)}` : ""}`
      : `${fmt.signed(p.followersGained)} (followers terakhir ${fmt.count(p.followersEnd)})`;
  const posts = p.posts.length
    ? p.posts.map(
        (x) =>
          `- ${x.title} · ${x.postedAt} · pilar ${x.pillar}, format ${x.format ?? "belum diisi"}, hook ${x.hookType ?? "belum diisi"} · skor relatif ${
            x.relativeScore === null ? "belum ada" : fmt.relative(x.relativeScore)
          }`,
      )
    : ["- tidak ada post minggu ini"];
  return [
    `## ${p.platform} (angka ${p.viewsLabel.toLowerCase()} ${p.platform} saja)`,
    `Post tayang minggu ini: ${p.postCount}`,
    `Followers bertambah: ${followers}`,
    `Post terbaik minggu ini: ${ref(p.best)}`,
    `Post terburuk minggu ini: ${ref(p.worst)}`,
    "Post minggu ini:",
    ...posts,
    `Median skor relatif per grup (semua post ${p.platform} sampai akhir minggu ini, ${p.scoredTotal} post berskor relatif):`,
    ...(p.groups.length ? p.groups.map(groupLine) : [`- belum ada grup (${NOT_ENOUGH_DATA})`]),
  ].join("\n");
}

export const reviewDraftPrompt: FeaturePrompt<ReviewDraftInput, ReviewDraftContext, ReviewDraftOutput> = {
  feature: "review-draft",
  version: "review-draft@1",
  targetType: "REVIEW",
  effort: "medium",
  maxTokens: 8000,
  initialEstimateUsd: 0.12,
  input: reviewDraftInput,
  task: `Tulis draf review mingguan untuk kreator dari ringkasan angka minggu ini di <data>. Kreator akan membaca, mengedit, lalu menyimpannya sendiri.

- narrative: 2-4 kalimat ringkasan minggu ini: post vs target, lalu tiap platform terpisah (post terbaik/terburuk, followers bertambah).
- wins: apa yang berhasil minggu ini (2-4 poin singkat, satu per baris diawali "- ").
- repeat: apa yang layak diulang minggu depan (2-3 poin), sebisa mungkin dari grup yang datanya cukup atau saran yang aktif.
- stop: apa yang sebaiknya dihentikan atau dikurangi (1-3 poin). Jika data belum cukup untuk menyimpulkan, tulis itu.
- focusNext: tepat 3 usulan fokus minggu depan, masing-masing satu kalimat yang bisa dikerjakan.
- Jika form sudah berisi tulisan kreator, pertahankan maksudnya dan lengkapi, jangan diganti total.
- Tulis sebagai catatan kreator untuk dirinya sendiri (bukan untuk penonton), singkat dan jujur.

${ANALYSIS_RULES}`,
  output: () =>
    z.object({
      narrative: z.string().max(1500),
      wins: z.string().max(REVIEW_TEXT_MAX),
      repeat: z.string().max(REVIEW_TEXT_MAX),
      stop: z.string().max(REVIEW_TEXT_MAX),
      focusNext: z.array(z.string().max(300)).length(REVIEW_FOCUS_COUNT),
      notes: notesSchema,
    }),
  render: (ctx) =>
    [
      `Minggu: ${ctx.weekLabel} (Senin-Minggu WIB)`,
      `Konten tayang: ${ctx.postedCount} dari target ${ctx.target} (satu konten di TikTok dan Instagram dihitung satu)`,
      "",
      ...ctx.platforms.map(platformBlock).flatMap((block) => [block, ""]),
      "Saran aturan yang aktif:",
      ...(ctx.suggestions.length ? ctx.suggestions.map((s) => `- ${s}`) : ["- tidak ada"]),
      "",
      "Isi form review saat ini:",
      dataLines([
        ["Apa yang berhasil", excerpt(ctx.current.wins, 1500)],
        ["Apa yang diulang", excerpt(ctx.current.repeat, 1500)],
        ["Apa yang dihentikan", excerpt(ctx.current.stop, 1500)],
        ["Fokus minggu depan", excerpt(ctx.current.focusNext, 1500)],
      ]) || "(kosong)",
    ].join("\n"),
};
