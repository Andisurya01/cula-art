import type { AiFeature } from "./features";

// Protokol respons POST /studio/ai: NDJSON, satu event JSON per baris. Dipakai route (server) dan panel (client).

export const AI_REQUEST_MAX_BYTES = 64 * 1024;
export const AI_STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

export type AiRequestBody = {
  feature: AiFeature;
  input: unknown;
  instruction?: string | null;
  previous?: unknown;
};

export type AiStreamEvent =
  /** Hasil sementara (objek JSON parsial). */
  | { type: "partial"; data: unknown }
  /** Hasil final yang sudah lolos validasi Zod. */
  | { type: "done"; runId: string; data: unknown; costUsd: number; model: string; mock: boolean }
  | { type: "error"; message: string };

/** Baca body NDJSON baris demi baris. Baris rusak dilewati. */
export async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<AiStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const event = parseLine(buffer.slice(0, newline));
        if (event) yield event;
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
      if (done) break;
    }
    const last = parseLine(buffer);
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}

function parseLine(line: string): AiStreamEvent | null {
  if (!line.trim()) return null;
  try {
    const event = JSON.parse(line) as { type?: unknown };
    return event && (event.type === "partial" || event.type === "done" || event.type === "error")
      ? (event as AiStreamEvent)
      : null;
  } catch {
    return null;
  }
}
