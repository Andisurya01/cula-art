import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import type { AiFeature } from "../features";
import type { HashtagSets } from "../guide-schema";
import type { AiContext, AiOutput } from "../prompts";

// Pemeriksaan otomatis hasil set uji (fungsi murni). "error" = jelas salah; "warn" = perlu dibaca manual.
// Kualitas gaya bahasa tetap dinilai manual dari laporan.

export type CheckIssue = { level: "error" | "warn"; message: string };

export type EvalRules = {
  avoidWords: string[];
  hashtagSets: HashtagSets;
  /** Nama pilar → id (untuk mencari set hashtag pilar). */
  pillarIds: Map<string, string>;
};

type Checkers = { [F in AiFeature]: (output: AiOutput<F>, ctx: AiContext<F>, rules: EvalRules) => CheckIssue[] };

const error = (message: string): CheckIssue => ({ level: "error", message });
const warn = (message: string): CheckIssue => ({ level: "warn", message });

function avoided(texts: (string | null | undefined)[], words: string[]): CheckIssue[] {
  const joined = texts.filter(Boolean).join("\n").toLowerCase();
  return words
    .filter((w) => new RegExp(`(^|[^\\p{L}])${escapeRegExp(w.toLowerCase())}([^\\p{L}]|$)`, "u").test(joined))
    .map((w) => error(`Memakai kata yang dihindari: "${w}"`));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function duplicates(values: string[], label: string): CheckIssue[] {
  const seen = new Set<string>();
  const dupes = values.filter((v) => {
    const key = v.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  return dupes.length ? [error(`${label} kembar: ${dupes.join(", ")}`)] : [];
}

function tooLong(values: string[], max: number, label: string): CheckIssue[] {
  const long = values.filter((v) => v.length > max);
  return long.length ? [warn(`${long.length} ${label} lebih dari ${max} karakter`)] : [];
}

/** Angka ukuran/tahun di teks padahal datanya kosong → kemungkinan dikarang. */
function inventedFacts(text: string, ctx: { size: string | null; year: number | null }): CheckIssue[] {
  const issues: CheckIssue[] = [];
  if (!ctx.size && /\d+([.,]\d+)?\s?(cm|mm|centimeter|sentimeter)\b/i.test(text)) issues.push(error("Menyebut ukuran padahal data ukuran kosong"));
  if (ctx.year === null && /\b(19|20)\d{2}\b/.test(text)) issues.push(warn("Menyebut tahun padahal tahun kosong"));
  return issues;
}

export const EVAL_CHECKS: Checkers = {
  "idea-expand": (out, _ctx, rules) => [
    ...duplicates(out.variations.map((v) => v.title), "Judul variasi"),
    ...tooLong(out.variations.map((v) => v.title), 80, "judul"),
    ...avoided(out.variations.flatMap((v) => [v.title, v.angle, v.reason]), rules.avoidWords),
  ],

  "project-ideas": (out, ctx, rules) => {
    const existing = new Set(ctx.contents.map((c) => c.title.trim().toLowerCase()));
    const maxPart = Math.max(0, ...ctx.contents.map((c) => c.seriesPart ?? 0));
    const issues = [
      ...duplicates(out.ideas.map((i) => i.title), "Judul ide"),
      ...out.ideas.filter((i) => existing.has(i.title.trim().toLowerCase())).map((i) => error(`Mengulang konten yang sudah ada: ${i.title}`)),
      ...avoided(out.ideas.flatMap((i) => [i.title, i.angle, i.reason]), rules.avoidWords),
    ];
    const lowParts = out.ideas.filter((i) => i.seriesPart !== null && i.seriesPart <= maxPart);
    if (lowParts.length) issues.push(warn(`Nomor part tidak melanjutkan seri (part terakhir ${maxPart})`));
    return issues;
  },

  hook: (out, _ctx, rules) => [
    ...duplicates(out.hooks.map((h) => h.text), "Hook"),
    ...tooLong(out.hooks.map((h) => h.text), 100, "hook"),
    ...avoided(out.hooks.flatMap((h) => [h.text, h.note]), rules.avoidWords),
  ],

  script: (out, ctx, rules) => {
    const issues = avoided([out.script, out.shotList], rules.avoidWords);
    if (!/\d+\s*[-–]\s*\d+\s*(dtk|detik|s)\b/i.test(out.script)) issues.push(warn("Script tidak memakai penanda detik (mis. 0-3 dtk)"));
    if (out.shotList.split("\n").filter((l) => l.trim()).length < 3) issues.push(warn("Shot list kurang dari 3 baris"));
    if (out.targetDurationSec < 5 || out.targetDurationSec > 180) issues.push(warn(`Target durasi tidak wajar: ${out.targetDurationSec} detik`));
    if (ctx.targetDurationSec && Math.abs(out.targetDurationSec - ctx.targetDurationSec) > ctx.targetDurationSec) {
      issues.push(warn(`Durasi jauh dari target di form (${ctx.targetDurationSec} detik)`));
    }
    return issues;
  },

  caption: (out, ctx, rules) => {
    const platform = PLATFORMS.find((p) => PLATFORM_LABELS[p] === ctx.platform) ?? "TIKTOK";
    const pillarId = ctx.pillar ? rules.pillarIds.get(ctx.pillar) : undefined;
    const allowed = new Set(
      [...rules.hashtagSets.general[platform], ...(pillarId ? (rules.hashtagSets.pillars[pillarId]?.[platform] ?? []) : [])].map((t) =>
        t.toLowerCase(),
      ),
    );
    const issues = [...duplicates(out.options.map((o) => o.caption), "Caption"), ...avoided(out.options.map((o) => o.caption), rules.avoidWords)];
    out.options.forEach((option, i) => {
      const label = `Opsi ${i + 1}`;
      const [min, max] = platform === "TIKTOK" ? [3, 5] : [5, 15];
      if (option.hashtags.length < min || option.hashtags.length > max) {
        issues.push(warn(`${label}: ${option.hashtags.length} hashtag (disarankan ${min}-${max} untuk ${ctx.platform})`));
      }
      if (platform === "TIKTOK" && option.caption.length > 300) issues.push(warn(`${label}: caption TikTok lebih dari 300 karakter`));
      if (/#[\p{L}\p{N}_]+/u.test(option.caption)) issues.push(warn(`${label}: ada hashtag di dalam caption`));
      const outside = option.hashtags.filter((t) => !allowed.has(t.toLowerCase()));
      if (allowed.size && outside.length) issues.push(warn(`${label}: hashtag di luar set: ${outside.join(" ")}`));
    });
    return issues;
  },

  "artwork-photos": (out, ctx, rules) => {
    const issues = [...avoided([out.summary, out.description, ...out.alts.map((a) => a.alt)], rules.avoidWords)];
    const missing = ctx.photos.filter((p) => !out.alts.some((a) => a.imageId === p.id));
    if (missing.length) issues.push(error(`${missing.length} foto tanpa teks alternatif`));
    issues.push(...tooLong(out.alts.map((a) => a.alt), 150, "teks alternatif"));
    if (out.alts.some((a) => /^(foto|gambar) (dari|ini)\b/i.test(a.alt.trim()))) issues.push(warn('Teks alternatif diawali "foto dari"/"gambar dari"'));
    if (out.summary.length > 200 || (out.summary.match(/[.!?](\s|$)/g)?.length ?? 0) > 1) issues.push(warn("Ringkasan lebih dari satu kalimat"));
    if (out.description.split(/\n\s*\n/).filter((p) => p.trim()).length < 2) issues.push(warn("Cerita kurang dari 2 paragraf"));
    issues.push(...inventedFacts(`${out.summary}\n${out.description}`, ctx));
    return issues;
  },
};

export function checkOutput<F extends AiFeature>(feature: F, output: AiOutput<F>, ctx: AiContext<F>, rules: EvalRules): CheckIssue[] {
  return (EVAL_CHECKS[feature] as (o: AiOutput<F>, c: AiContext<F>, r: EvalRules) => CheckIssue[])(output, ctx, rules);
}
