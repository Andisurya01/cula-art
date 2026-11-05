import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { UsageLike } from "./models";

// Satu-satunya tempat yang membaca ANTHROPIC_API_KEY dan membuat klien SDK. Hanya dipakai di server.

let client: Anthropic | null = null;

/** Mode uji (AI_MOCK=1): jawaban contoh tanpa memanggil API. */
export function isAiMockMode(): boolean {
  return process.env.AI_MOCK === "1";
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getAnthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim(), maxRetries: 2, timeout: 300_000 });
  return client;
}

export type StreamResult = {
  stopReason: string | null;
  /** Kategori penolakan dari `stop_details` (mis. "cyber"), hanya untuk stop_reason "refusal". */
  refusalCategory?: string | null;
  /** Teks JSON hasil akhir (setelah blok fallback terakhir, jika ada). */
  text: string;
  usage: UsageLike | null;
  /** Model yang menghasilkan pesan akhir (bisa model fallback). */
  model: string;
};

/**
 * Error saat streaming, membawa usage yang sudah terlihat (token tetap ditagih walau gagal/dibatalkan).
 * `estimated` = token output diperkirakan, karena stream putus sebelum usage akhir (`message_delta`) datang.
 */
export class AiStreamError extends Error {
  constructor(
    readonly original: unknown,
    readonly usage: UsageLike | null,
    readonly estimated = false,
  ) {
    super(original instanceof Error ? original.message : String(original));
    this.name = "AiStreamError";
  }
}

/**
 * Laju output untuk memperkirakan token yang sudah dihasilkan saat stream putus. Sengaja tinggi (termasuk
 * thinking yang tidak terlihat), supaya batas biaya cenderung terlalu ketat daripada kebobolan.
 */
const ESTIMATED_OUTPUT_TOKENS_PER_SECOND = 100;

/** Usage untuk stream yang putus sebelum `message_delta`: output = maks(dilaporkan, teks/3, durasi×laju), ≤ max_tokens. */
export function estimateCutUsage(
  started: UsageLike,
  { textChars, elapsedMs, maxTokens }: { textChars: number; elapsedMs: number; maxTokens: number },
): UsageLike {
  const outputTokens = Math.max(
    started.output_tokens,
    Math.ceil(textChars / 3),
    Math.ceil((elapsedMs / 1000) * ESTIMATED_OUTPUT_TOKENS_PER_SECOND),
  );
  return { ...started, output_tokens: Math.min(maxTokens, outputTokens) };
}

export type StreamOptions = {
  signal: AbortSignal;
  /** Dipanggil dengan teks JSON kumulatif setiap ada potongan baru (direset saat fallback mengambil alih). */
  onText: (snapshot: string) => void;
};

export async function streamClaude(params: BetaMessageStreamParams, options: StreamOptions): Promise<StreamResult> {
  const startedAt = Date.now();
  const stream = getAnthropic().beta.messages.stream(params, { signal: options.signal });
  let text = "";
  let streamedChars = 0;
  let finalUsageSeen = false;
  stream.on("streamEvent", (event) => {
    if (event.type === "content_block_start" && event.content_block.type === "fallback") {
      // Model cadangan menjawab ulang dari awal; potongan model yang menolak dibuang.
      text = "";
      options.onText(text);
    } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      streamedChars += event.delta.text.length;
      options.onText(text);
    } else if (event.type === "message_delta") {
      finalUsageSeen = true;
    }
  });
  try {
    const message = await stream.finalMessage();
    return {
      stopReason: message.stop_reason,
      refusalCategory: message.stop_details?.category ?? null,
      text: finalText(message),
      usage: message.usage,
      model: message.model,
    };
  } catch (error) {
    const started = stream.currentMessage?.usage ?? null;
    if (!started || finalUsageSeen) throw new AiStreamError(error, started);
    throw new AiStreamError(
      error,
      estimateCutUsage(started, { textChars: streamedChars, elapsedMs: Date.now() - startedAt, maxTokens: params.max_tokens }),
      true,
    );
  }
}

function finalText(message: BetaMessage): string {
  const lastFallback = message.content.findLastIndex((block) => block.type === "fallback");
  return message.content
    .slice(lastFallback + 1)
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}
