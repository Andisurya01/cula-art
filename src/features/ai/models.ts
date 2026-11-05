// Model yang boleh dipilih di Pengaturan + harga per 1 juta token (US$), untuk menghitung AiRun.costUsd.
// Harga Anthropic per Oktober 2026; perbarui di sini jika harga berubah. Tulis cache 5 menit = 1,25× input.

export type ModelPrice = { input: number; output: number; cacheWrite: number; cacheRead: number };

export const AI_MODEL_IDS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"] as const;
export type AiModelId = (typeof AI_MODEL_IDS)[number];

export const DEFAULT_AI_MODEL: AiModelId = "claude-opus-5-5";

/** Nama model di AiRun untuk mode uji (AI_MOCK=1); biayanya 0. */
export const MOCK_MODEL = "mock";

export const AI_MODELS: Record<
  AiModelId,
  { label: string; note: string; price: ModelPrice; serverFallback: boolean }
> = {
  "claude-opus-5-5": {
    label: "Claude Opus 5.5",
    note: "Default. Kualitas terbaik.",
    price: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
    serverFallback: true,
  },
  "claude-sonnet-5-5": {
    label: "Claude Sonnet 5.5",
    note: "Setengah harga Opus. Pilih setelah dibandingkan dengan set uji.",
    price: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
    serverFallback: true,
  },
  "claude-haiku-5-5": {
    label: "Claude Haiku 5.5",
    note: "Paling murah, untuk tugas ringan. Tanpa fallback penolakan.",
    price: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
    serverFallback: false,
  },
};

// Model cadangan yang bisa menjawab lewat fallback server-side (`fallbacks: "default"`).
const FALLBACK_PRICES: Record<string, ModelPrice> = {
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};

// Model yang tidak dikenal dihitung dengan harga termahal di atas, supaya batas biaya tidak kebobolan.
const UNKNOWN_PRICE: ModelPrice = { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 };
const ZERO_PRICE: ModelPrice = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === "string" && (AI_MODEL_IDS as readonly string[]).includes(value);
}

export function priceOf(model: string): ModelPrice {
  if (model === MOCK_MODEL) return ZERO_PRICE;
  if (isAiModelId(model)) return AI_MODELS[model].price;
  return FALLBACK_PRICES[model] ?? UNKNOWN_PRICE;
}

/** Perkiraan kasar token input: ±3 karakter per token teks Indonesia, ±1.100 token per foto 1024 px. */
export function estimateInputTokens(promptChars: number, photoCount: number): number {
  return Math.ceil(promptChars / 3) + photoCount * 1_100;
}

/**
 * Biaya terburuk satu panggilan (seluruh input tanpa cache + `maxTokens` output), dipesan di AiRun saat
 * reservasi supaya panggilan yang sedang berjalan ikut dihitung di batas bulanan. Model dengan fallback
 * memakai harga termahal karena model cadangan bisa lebih mahal.
 */
export function worstCaseCostUsd(model: AiModelId, inputTokens: number, maxTokens: number): number {
  const price = AI_MODELS[model].serverFallback ? UNKNOWN_PRICE : AI_MODELS[model].price;
  return Math.round(((inputTokens * price.input + maxTokens * price.output) / 1_000_000) * 1_000_000) / 1_000_000;
}

/** Bentuk usage dari SDK (`message.usage`) yang dibutuhkan untuk menghitung biaya. */
export type UsageLike = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  /** Per percobaan (termasuk percobaan yang ditolak lalu fallback). `model` null = model yang diminta. */
  iterations?:
    | {
        model?: string | null;
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number | null;
        cache_creation_input_tokens?: number | null;
      }[]
    | null;
};

export type RunCost = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
};

export const EMPTY_RUN_COST: RunCost = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: 0,
};

/**
 * Token dan biaya satu panggilan. Jika ada `iterations` (fallback), setiap percobaan dihitung dengan harga
 * model yang menjalankannya; usage tingkat atas hanya mencakup percobaan terakhir.
 */
export function computeRunCost(usage: UsageLike | null | undefined, requestedModel: string): RunCost {
  if (!usage) return EMPTY_RUN_COST;
  const parts = usage.iterations?.length
    ? usage.iterations.map((it) => ({ ...it, model: it.model ?? requestedModel }))
    : [{ ...usage, model: requestedModel }];

  const total = { ...EMPTY_RUN_COST };
  for (const part of parts) {
    const price = priceOf(part.model);
    const cacheRead = part.cache_read_input_tokens ?? 0;
    const cacheWrite = part.cache_creation_input_tokens ?? 0;
    total.inputTokens += part.input_tokens;
    total.outputTokens += part.output_tokens;
    total.cacheReadTokens += cacheRead;
    total.cacheWriteTokens += cacheWrite;
    total.costUsd +=
      (part.input_tokens * price.input +
        part.output_tokens * price.output +
        cacheRead * price.cacheRead +
        cacheWrite * price.cacheWrite) /
      1_000_000;
  }
  total.costUsd = Math.round(total.costUsd * 1_000_000) / 1_000_000;
  return total;
}
