import { z } from "zod";
import { ANALYSIS_RULES, fmt, groupLine, metricLines, type GroupStat, type MetricNumbers } from "./analysis-common";
import { notesSchema, type FeaturePrompt } from "./types";

// Detail post → "Kenapa?": penjelasan kenapa post ini di atas/bawah biasanya, dengan membandingkan tagnya
// dengan post sebanding di platform yang sama. Hanya untuk post yang punya skor relatif (E9).

export const postWhyInput = z.object({ postId: z.string().min(1, "Post tidak valid") });
export type PostWhyInput = z.output<typeof postWhyInput>;

export type PostWhyContext = {
  title: string;
  /** Label platform, mis. "TikTok". */
  platform: string;
  /** "Views" (TikTok) atau "Reach" (Instagram). */
  viewsLabel: string;
  /** Waktu tayang WIB, mis. "Sabtu, 7 Nov 2026 19.10 WIB". */
  postedAt: string;
  pillar: string;
  format: string | null;
  hookType: string | null;
  hookText: string | null;
  durationSec: number | null;
  /** Snapshot yang dipakai: "H+7", atau "H+1" (cadangan, angka belum final). */
  snapshot: "H+7" | "H+1";
  metrics: MetricNumbers;
  er: number;
  saveRate: number;
  shareRate: number;
  followRate: number;
  score: number;
  relativeScore: number;
  baselineMedian: number;
  baselineCount: number;
  /** Grup post lain di platform yang sama dengan tag yang sama (tanpa post ini). */
  comparisons: GroupStat[];
  /** Post lain di platform ini yang punya skor relatif. */
  comparablePostCount: number;
};

export type PostWhyReason = { factor: string; explanation: string };
export type PostWhyOutput = { verdict: string; reasons: PostWhyReason[]; tryNext: string; notes: string | null };

export const postWhyPrompt: FeaturePrompt<PostWhyInput, PostWhyContext, PostWhyOutput> = {
  feature: "post-why",
  version: "post-why@1",
  targetType: "POST",
  effort: "medium",
  maxTokens: 6000,
  initialEstimateUsd: 0.06,
  input: postWhyInput,
  task: `Jelaskan kenapa post di bawah tampil di atas atau di bawah biasanya, untuk kreator yang membuatnya.

- verdict: 1-2 kalimat. Sebut skor relatifnya dan artinya (di atas, sekitar, atau di bawah biasanya) di platform ini.
- reasons: 2-4 faktor yang paling mungkin menjelaskan hasilnya. Bandingkan tag post ini (pilar, format, tipe hook, hari, jam, durasi) dengan grup post sebanding di <data>, dan pakai angka post ini (mis. save rate, share rate) bila relevan. factor = nama faktor singkat; explanation = 1-2 kalimat dengan angka dari <data>.
- tryNext: satu hal konkret yang layak dicoba di post berikutnya, berdasarkan faktor di atas.
- Ini penjelasan yang mungkin, bukan kepastian. Jika snapshot yang dipakai H+1, sebutkan bahwa angkanya belum final.

${ANALYSIS_RULES}`,
  output: () =>
    z.object({
      verdict: z.string().max(500),
      reasons: z
        .array(
          z.object({
            factor: z.string().max(100).describe("Nama faktor, mis. Tipe hook"),
            explanation: z.string().max(600),
          }),
        )
        .min(1)
        .max(5)
        .describe("2-4 faktor"),
      tryNext: z.string().max(600),
      notes: notesSchema,
    }),
  render: (ctx) => {
    const tag = (label: string, value: string | number | null, suffix = "") =>
      `${label}: ${value === null || value === "" ? "belum diisi" : `${value}${suffix}`}`;
    return [
      `Platform: ${ctx.platform}`,
      `Judul post: ${ctx.title}`,
      `Tayang: ${ctx.postedAt}`,
      tag("Pilar", ctx.pillar),
      tag("Format", ctx.format),
      tag("Tipe hook", ctx.hookType),
      ...(ctx.hookText ? [`Teks hook: ${ctx.hookText}`] : []),
      tag("Durasi", ctx.durationSec, " detik"),
      `Snapshot yang dipakai: ${ctx.snapshot}${ctx.snapshot === "H+1" ? " (cadangan, H+7 belum diisi)" : ""}`,
      "",
      `Angka post ini (${ctx.platform}):`,
      metricLines(ctx.viewsLabel, ctx.metrics),
      `- ER ${fmt.percent(ctx.er)}, save rate ${fmt.percent(ctx.saveRate)}, share rate ${fmt.percent(ctx.shareRate)}, follow rate ${fmt.followRate(ctx.followRate)} per 1.000 ${ctx.viewsLabel.toLowerCase()}`,
      `- Skor ${fmt.score(ctx.score)}; median skor ${ctx.baselineCount} post sebelumnya di ${ctx.platform}: ${fmt.score(ctx.baselineMedian)}; skor relatif ${fmt.relative(ctx.relativeScore)}`,
      "",
      `Post sebanding di ${ctx.platform} dengan tag yang sama (tanpa post ini, dari ${ctx.comparablePostCount} post lain yang punya skor relatif):`,
      ...(ctx.comparisons.length ? ctx.comparisons.map(groupLine) : ["- belum ada"]),
    ].join("\n");
  },
};
