import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { formatWib } from "@/lib/date";
import { hasAnthropicKey, isAiMockMode } from "../client";
import { CONTEXT_LOADERS, loadTaxonomy } from "../context";
import { AI_FEATURE_LABELS, type AiFeature } from "../features";
import { formatUsd } from "../format";
import type { GuideTaxonomy } from "../guide";
import { AI_MODELS, MOCK_MODEL, type AiModelId } from "../models";
import { FEATURE_PROMPTS, promptVersionOf, type AiContext } from "../prompts";
import { MAX_ARTWORK_AI_PHOTOS } from "../prompts/artwork-photos";
import type { TaxonomyNames } from "../prompts/types";
import { getAiGuide } from "../queries";
import { buildSystemText, executeAiCall } from "../run";
import { EVAL_CASES, type EvalCase } from "./cases";
import { checkOutput, type EvalRules } from "./checks";
import { EVAL_AVOID_WORDS, EVAL_GUIDE, EVAL_NAMES, EVAL_TAXONOMY } from "./fixtures";
import { renderEvalReport, summarizeEval, type EvalCaseResult } from "./report";

// Runner set uji (dipanggil scripts/ai-eval.ts). Setiap kasus lewat executeAiCall yang sama dengan Studio:
// ikut batas biaya/harian dan tercatat di AiRun sebagai targetType EVAL. Memakai biaya API kecuali AI_MOCK=1.

export const EVAL_REPORT_DIR = ".ai-evals";

export type EvalOptions = {
  features: AiFeature[];
  model: AiModelId;
  /** Maks. kasus per fitur. */
  limit?: number;
  /** Panduan AI dan kategori dari database, bukan contoh tetap. */
  useDbGuide: boolean;
  signal: AbortSignal;
  log: (line: string) => void;
  /** Folder laporan (default .ai-evals). */
  reportDir?: string;
};

type Setup = { systemText: string; names: TaxonomyNames; rules: EvalRules; guideLabel: "contoh" | "database" };

async function setup(useDbGuide: boolean): Promise<Setup> {
  if (!useDbGuide) {
    return {
      systemText: buildSystemText(EVAL_GUIDE, EVAL_TAXONOMY),
      names: EVAL_NAMES,
      rules: {
        avoidWords: EVAL_AVOID_WORDS,
        hashtagSets: EVAL_GUIDE.hashtagSets,
        pillarIds: new Map(EVAL_TAXONOMY.pillars.map((p) => [p.name, p.id])),
      },
      guideLabel: "contoh",
    };
  }
  const [guide, taxonomy] = await Promise.all([getAiGuide(), loadTaxonomy()]);
  const guideTaxonomy: GuideTaxonomy = { pillars: taxonomy.pillars, formats: taxonomy.names.formats, hookTypes: taxonomy.names.hookTypes };
  return {
    systemText: buildSystemText(guide, guideTaxonomy),
    names: taxonomy.names,
    rules: { avoidWords: [], hashtagSets: guide.hashtagSets, pillarIds: new Map(taxonomy.pillars.map((p) => [p.name, p.id])) },
    guideLabel: "database",
  };
}

/** Kasus "Karya dari foto": karya berfoto terbaru di database (maks. 4 foto, foto karya jadi dulu). */
export async function loadArtworkPhotoCases(limit: number): Promise<EvalCase<AiContext<"artwork-photos">>[]> {
  const artworks = await db.artwork.findMany({
    where: { images: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      medium: true,
      year: true,
      materials: true,
      widthCm: true,
      heightCm: true,
      depthCm: true,
      images: { orderBy: [{ isProcess: "asc" }, { order: "asc" }], take: MAX_ARTWORK_AI_PHOTOS, select: { id: true } },
    },
  });
  const taxonomy = await loadTaxonomy();
  const cases: EvalCase<AiContext<"artwork-photos">>[] = [];
  for (const a of artworks) {
    // Teks Galeri yang sudah ada sengaja tidak dikirim, supaya AI menulis dari foto dan data saja.
    const { context } = await CONTEXT_LOADERS["artwork-photos"](
      { ...a, artworkId: a.id, imageIds: a.images.map((i) => i.id), notes: null, summary: null, description: null },
      taxonomy,
    );
    cases.push({ id: `k-${a.id.slice(-6)}`, title: a.title, context: { ...context, photos: context.photos.map((p) => ({ ...p, currentAlt: "" })) } });
  }
  return cases;
}

export async function casesFor(feature: AiFeature, limit?: number): Promise<EvalCase<AiContext<AiFeature>>[]> {
  const max = limit ?? 10;
  const cases = feature === "artwork-photos" ? await loadArtworkPhotoCases(max) : EVAL_CASES[feature].slice(0, max);
  return cases as EvalCase<AiContext<AiFeature>>[];
}

/** Perkiraan biaya sebelum dijalankan (angka awal per fitur × jumlah kasus, disesuaikan harga model). */
export function estimateEvalUsd(counts: Partial<Record<AiFeature, number>>, model: AiModelId): number {
  const ratio = AI_MODELS[model].price.output / AI_MODELS["claude-opus-5-5"].price.output;
  return Object.entries(counts).reduce(
    (sum, [feature, n]) => sum + FEATURE_PROMPTS[feature as AiFeature].initialEstimateUsd * (n ?? 0) * ratio,
    0,
  );
}

export async function runEvals(options: EvalOptions): Promise<{ results: EvalCaseResult[]; reportPath: string | null }> {
  const mock = isAiMockMode();
  if (!mock && !hasAnthropicKey()) throw new Error("ANTHROPIC_API_KEY belum diisi di .env (atau pakai AI_MOCK=1).");
  const { systemText, names, rules, guideLabel } = await setup(options.useDbGuide);
  const startedAt = new Date();
  const results: EvalCaseResult[] = [];

  outer: for (const feature of options.features) {
    const cases = await casesFor(feature, options.limit);
    if (cases.length === 0) options.log(`${AI_FEATURE_LABELS[feature]}: tidak ada kasus (belum ada karya berfoto?)`);
    for (const c of cases) {
      if (options.signal.aborted) break outer;
      const started = Date.now();
      const outcome = await executeAiCall({
        feature,
        context: c.context,
        targetId: `${feature}:${c.id}`,
        names,
        systemText,
        model: options.model,
        mock,
        evaluation: true,
        signal: options.signal,
      });
      const durationMs = Date.now() - started;
      const result: EvalCaseResult = outcome.ok
        ? {
            feature,
            caseId: c.id,
            title: c.title,
            ok: true,
            model: outcome.model,
            output: outcome.output,
            issues: checkOutput(feature, outcome.output, c.context, rules),
            costUsd: outcome.cost.costUsd,
            durationMs,
          }
        : { feature, caseId: c.id, title: c.title, ok: false, error: outcome.error, issues: [], costUsd: 0, durationMs };
      if (!outcome.ok && outcome.runId) {
        result.costUsd = (await db.aiRun.findUnique({ where: { id: outcome.runId }, select: { costUsd: true } }))?.costUsd ?? 0;
      }
      results.push(result);
      const errors = result.issues.filter((i) => i.level === "error").length;
      options.log(
        `${feature} ${c.id} ${result.ok ? (errors ? `ERROR (${errors})` : "OK") : `GAGAL: ${result.error}`} · ${formatUsd(result.costUsd)}`,
      );
      // Batas biaya/harian tercapai: kasus berikutnya pasti ditolak juga.
      if (!outcome.ok && !outcome.runId) break outer;
    }
  }

  if (results.length === 0) return { results, reportPath: null };
  const stamp = formatWib(startedAt, "yyyy-MM-dd_HHmm");
  const scope = options.features.length === 1 ? options.features[0] : "semua";
  const model = mock ? MOCK_MODEL : options.model;
  const reportDir = options.reportDir ?? EVAL_REPORT_DIR;
  const reportPath = join(reportDir, `${stamp}-${scope}-${model}.md`);
  await mkdir(reportDir, { recursive: true });
  await writeFile(
    reportPath,
    renderEvalReport(results, {
      startedAt: formatWib(startedAt, "d MMM yyyy HH:mm 'WIB'"),
      model,
      guide: guideLabel,
      promptVersions: Object.fromEntries(options.features.map((f) => [f, promptVersionOf(f)])),
    }),
    "utf8",
  );
  const total = summarizeEval(results);
  options.log(`Selesai: ${total.passed}/${total.cases} lolos, ${total.warnings} peringatan, biaya ${formatUsd(total.costUsd)}.`);
  return { results, reportPath };
}
