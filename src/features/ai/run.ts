import "server-only";
import { z } from "zod";
import { APIUserAbortError } from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { db } from "@/lib/db";
import { AiStreamError, hasAnthropicKey, isAiMockMode, streamClaude, type StreamResult } from "./client";
import { AiContextError, CONTEXT_LOADERS, loadTaxonomy, type LoadedContext, type Taxonomy } from "./context";
import { AI_MESSAGES, aiErrorMessage } from "./errors";
import { AI_FEATURES, type AiFeature } from "./features";
import { renderGuide, type GuideTaxonomy } from "./guide";
import { parseAiGuideRow, type AiGuideContent } from "./guide-schema";
import { reserveAiRun } from "./limits";
import { mockRawOutput, streamMock } from "./mock";
import {
  AI_MODELS,
  computeRunCost,
  estimateInputTokens,
  MOCK_MODEL,
  worstCaseCostUsd,
  type AiModelId,
  type RunCost,
} from "./models";
import { toOutputFormat } from "./output-schema";
import { parsePartialJson } from "./partial-json";
import { loadPromptPhoto } from "./photos";
import {
  composeUserText,
  FEATURE_PROMPTS,
  promptVersionOf,
  type AiContext,
  type AiInput,
  type AiOutput,
  type AiRaw,
} from "./prompts";
import { BASE_INSTRUCTIONS } from "./prompts/base";
import type { FeaturePrompt, TaxonomyNames } from "./prompts/types";
import { getAiGuideRow } from "./queries";
import type { AiStreamEvent } from "./stream-protocol";

// Alur satu panggilan AI (dipanggil Route Handler setelah requireAdmin(), atau runner set uji):
// validasi input → data → cek batas + reservasi AiRun → stream ke Claude → validasi Zod → catat AiRun → draf.
// Tidak pernah menulis ke Idea/Content/Post/Project/Artwork: hasil hanya dikirim ke form sebagai draf.

/** Selang minimum antar event `partial` (ms). */
const PARTIAL_INTERVAL_MS = 150;
/** Batas `outputJson` yang disimpan untuk hasil yang gagal divalidasi (untuk ditelusuri). */
const MAX_STORED_INVALID_OUTPUT = 20_000;

/** Fallback server-side saat model menolak (beta, keputusan P1 Fase 3). */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const aiRequestSchema = z.object({
  feature: z.enum(AI_FEATURES, { error: AI_MESSAGES.unknownFeature }),
  input: z.unknown(),
  instruction: z.string().trim().max(500, "Instruksi tambahan maksimal 500 karakter").nullable().optional(),
  previous: z.unknown().optional(),
});

export type RunAiOptions = {
  signal: AbortSignal;
  emit?: (event: AiStreamEvent) => void;
  instruction?: string | null;
  previous?: unknown;
  /** Set uji: dicatat sebagai targetType EVAL dan boleh jalan saat AI nonaktif (batas biaya tetap berlaku). */
  evaluation?: boolean;
};

export type AiRunOutcome<F extends AiFeature> =
  | { ok: true; runId: string; output: AiOutput<F>; cost: RunCost; model: string }
  | { ok: false; error: string; runId?: string };

/** Body request route (sudah di-parse JSON) → event NDJSON. */
export async function runAiRequest(body: unknown, options: Omit<RunAiOptions, "instruction" | "previous">) {
  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    options.emit?.({ type: "error", message: parsed.error.issues[0]?.message ?? AI_MESSAGES.badInput });
    return;
  }
  const { feature, input, instruction, previous } = parsed.data;
  await runAiFeature(feature, input, { ...options, instruction, previous });
}

export async function runAiFeature<F extends AiFeature>(
  feature: F,
  rawInput: unknown,
  options: RunAiOptions,
): Promise<AiRunOutcome<F>> {
  const emit = options.emit ?? (() => {});
  const fail = (error: string, runId?: string): AiRunOutcome<F> => {
    emit({ type: "error", message: error });
    return { ok: false, error, runId };
  };

  const def = FEATURE_PROMPTS[feature] as FeaturePrompt<AiInput<F>, AiContext<F>, AiOutput<F>, AiRaw<F>>;
  const input = def.input.safeParse(rawInput);
  if (!input.success) return fail(input.error.issues[0]?.message ?? AI_MESSAGES.badInput);

  const mock = isAiMockMode();
  if (!mock && !hasAnthropicKey()) return fail(AI_MESSAGES.noKey);

  const [guideRow, taxonomy] = await Promise.all([getAiGuideRow(), loadTaxonomy()]);
  const guide = parseAiGuideRow(guideRow);
  if (!options.evaluation && !guide.isEnabled) return fail(AI_MESSAGES.disabled);

  let loaded: LoadedContext<AiContext<F>>;
  try {
    const loader = CONTEXT_LOADERS[feature] as (
      input: AiInput<F>,
      taxonomy: Taxonomy,
    ) => Promise<LoadedContext<AiContext<F>>>;
    loaded = await loader(input.data, taxonomy);
  } catch (error) {
    if (error instanceof AiContextError) return fail(error.message);
    throw error;
  }
  return executeAiCall({
    ...options,
    feature,
    context: loaded.context,
    targetId: loaded.targetId,
    names: taxonomy.names,
    systemText: buildSystemText(guide, {
      pillars: taxonomy.pillars,
      formats: taxonomy.names.formats,
      hookTypes: taxonomy.names.hookTypes,
    }),
    model: guide.model,
    mock,
  });
}

/** Prompt sistem (awalan yang di-cache): instruksi dasar + Panduan AI. */
export function buildSystemText(guide: AiGuideContent, taxonomy: GuideTaxonomy): string {
  return `${BASE_INSTRUCTIONS}\n\n${renderGuide(guide, taxonomy)}`;
}

export type AiCallArgs<F extends AiFeature> = RunAiOptions & {
  feature: F;
  context: AiContext<F>;
  targetId: string | null;
  names: TaxonomyNames;
  systemText: string;
  model: AiModelId;
  mock: boolean;
};

/**
 * Satu panggilan dengan konteks yang sudah jadi (dari DB, atau dari kasus set uji):
 * foto → cek batas + reservasi AiRun → stream → validasi → catat AiRun.
 */
export async function executeAiCall<F extends AiFeature>(args: AiCallArgs<F>): Promise<AiRunOutcome<F>> {
  const { feature, context } = args;
  const emit = args.emit ?? (() => {});
  const fail = (error: string, runId?: string): AiRunOutcome<F> => {
    emit({ type: "error", message: error });
    return { ok: false, error, runId };
  };
  const def = FEATURE_PROMPTS[feature] as FeaturePrompt<AiInput<F>, AiContext<F>, AiOutput<F>, AiRaw<F>>;

  const photos = def.photos?.(context) ?? [];
  const photoData = await Promise.all(photos.map((p) => loadPromptPhoto(p.storageKey)));
  if (photoData.some((data) => data === null)) return fail("File foto tidak ditemukan di server. Muat ulang halaman.");

  const { systemText } = args;
  const userText = composeUserText(def, context, { instruction: args.instruction, previous: args.previous });
  const outputSchema = def.output(args.names, context);
  const model = args.mock ? MOCK_MODEL : args.model;

  // Klien sudah pergi sebelum dikirim: jangan pakai slot harian.
  if (args.signal.aborted) return fail(AI_MESSAGES.aborted);
  const reservation = await reserveAiRun(
    {
      feature,
      model,
      promptVersion: promptVersionOf(feature),
      targetType: args.evaluation ? "EVAL" : def.targetType,
      targetId: args.targetId,
      // Biaya terburuk dipesan dulu, supaya panggilan bersamaan ikut terhitung di batas bulanan.
      costUsd: args.mock
        ? 0
        : worstCaseCostUsd(args.model, estimateInputTokens(systemText.length + userText.length, photos.length), def.maxTokens),
    },
    { requireEnabled: !args.evaluation },
  );
  if (!reservation.ok) return fail(reservation.error);
  const { runId } = reservation;
  const startedAt = Date.now();

  // Hasil sementara: teks JSON kumulatif → objek parsial, paling sering tiap PARTIAL_INTERVAL_MS.
  let lastPartialAt = 0;
  const onText = (snapshot: string) => {
    const now = Date.now();
    if (now - lastPartialAt < PARTIAL_INTERVAL_MS) return;
    const data = parsePartialJson(snapshot);
    if (data !== null) {
      lastPartialAt = now;
      emit({ type: "partial", data });
    }
  };

  let result: StreamResult;
  try {
    if (args.mock) {
      result = await streamMock(mockRawOutput(feature, args.names, context), {
        signal: args.signal,
        onText,
        instruction: args.instruction,
        promptChars: systemText.length + userText.length,
      });
    } else {
      const content: BetaContentBlockParam[] = [];
      photos.forEach((photo, i) => {
        content.push({ type: "text", text: photo.label });
        content.push({ type: "image", source: { type: "base64", media_type: "image/webp", data: photoData[i]! } });
      });
      content.push({ type: "text", text: userText });
      // Skema dengan enum utuh (lihat output-schema.ts); validasi Zod dilakukan sendiri setelah stop_reason dicek.
      const format = toOutputFormat(outputSchema);
      const params: BetaMessageStreamParams = {
        model: args.model,
        max_tokens: def.maxTokens,
        // Awalan stabil (instruksi dasar + Panduan AI) di-cache; data per permintaan ada di pesan user.
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        output_config: { effort: def.effort, format },
        ...(AI_MODELS[args.model].serverFallback ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
      };
      result = await streamClaude(params, { signal: args.signal, onText });
    }
  } catch (error) {
    const original = error instanceof AiStreamError ? error.original : error;
    const usage = error instanceof AiStreamError ? error.usage : null;
    const estimated = error instanceof AiStreamError && error.estimated;
    const message = aiErrorMessage(original);
    if (!(original instanceof APIUserAbortError)) console.error(`[ai] ${feature} gagal:`, original);
    await finishRun(runId, startedAt, computeRunCost(usage, model), {
      status: "ERROR",
      // Stream terputus sebelum usage akhir datang: token output diperkirakan (lihat streamClaude).
      errorMessage: estimated ? `${message} (biaya diperkirakan)` : message,
    });
    return fail(message, runId);
  }

  const cost = computeRunCost(result.usage, model);
  if (result.stopReason === "refusal") {
    const category = result.refusalCategory ? ` (kategori: ${result.refusalCategory})` : "";
    await finishRun(runId, startedAt, cost, { status: "REFUSED", errorMessage: `${AI_MESSAGES.refused}${category}` });
    return fail(AI_MESSAGES.refused, runId);
  }
  if (result.stopReason === "max_tokens") {
    await finishRun(runId, startedAt, cost, { status: "ERROR", errorMessage: AI_MESSAGES.truncated });
    return fail(AI_MESSAGES.truncated, runId);
  }

  const validated = outputSchema.safeParse(safeJsonParse(result.text));
  if (!validated.success) {
    console.error(`[ai] ${feature} output tidak valid:`, validated.error.issues.slice(0, 5));
    await finishRun(runId, startedAt, cost, {
      status: "ERROR",
      errorMessage: AI_MESSAGES.invalidOutput,
      outputJson: result.text.slice(0, MAX_STORED_INVALID_OUTPUT),
    });
    return fail(AI_MESSAGES.invalidOutput, runId);
  }

  // Tanpa normalize, jawaban model sudah berbentuk output (raw = output untuk fitur itu).
  const output = def.normalize ? def.normalize(validated.data, context) : (validated.data as unknown as AiOutput<F>);
  await finishRun(runId, startedAt, cost, { status: "OK", outputJson: JSON.stringify(output) });
  emit({ type: "done", runId, data: output, costUsd: cost.costUsd, model: result.model, mock: args.mock });
  return { ok: true, runId, output, cost, model: result.model };
}

async function finishRun(
  runId: string,
  startedAt: number,
  cost: RunCost,
  data: { status: "OK" | "ERROR" | "REFUSED"; errorMessage?: string; outputJson?: string },
) {
  await db.aiRun.update({
    where: { id: runId },
    data: { ...cost, ...data, durationMs: Date.now() - startedAt },
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
