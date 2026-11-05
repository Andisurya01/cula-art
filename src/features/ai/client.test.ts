// streamClaude dengan respons SSE palsu (tanpa jaringan, tanpa biaya): fallback, penolakan, dan stream putus.

import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AiStreamError, estimateCutUsage, streamClaude } from "./client";

type Event = Record<string, unknown>;

let respond: (signal?: AbortSignal) => Response = () => new Response("", { status: 500 });

/** Body SSE dari daftar event, dengan jeda per event; berhenti dengan AbortError saat dibatalkan. */
function sse(events: Event[], delayMs = 1) {
  return (signal?: AbortSignal) => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
        for (const event of events) {
          await new Promise((r) => setTimeout(r, delayMs));
          if (signal?.aborted) return;
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_test" } });
  };
}

const START_USAGE = { input_tokens: 5000, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
const messageStart = (model = "claude-opus-5-5"): Event => ({
  type: "message_start",
  message: { id: "msg_1", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE },
});
const textBlock = (index: number, text: string): Event[] => [
  { type: "content_block_start", index, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index, delta: { type: "text_delta", text } },
  { type: "content_block_stop", index },
];
const messageDelta = (stopReason: string, extra: Event = {}): Event => ({
  type: "message_delta",
  delta: { stop_reason: stopReason, stop_sequence: null, stop_details: null, ...extra },
  usage: { output_tokens: 300 },
});

const PARAMS: BetaMessageStreamParams = { model: "claude-opus-5-5", max_tokens: 1000, messages: [{ role: "user", content: "x" }] };

beforeAll(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-bukan-asli");
  vi.stubGlobal("fetch", (_url: unknown, init?: RequestInit) => Promise.resolve(respond(init?.signal ?? undefined)));
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const run = (signal = new AbortController().signal) => {
  const snapshots: string[] = [];
  return { snapshots, promise: streamClaude(PARAMS, { signal, onText: (t) => snapshots.push(t) }) };
};

describe("streamClaude", () => {
  it("mengumpulkan teks dan usage akhir", async () => {
    respond = sse([messageStart(), ...textBlock(0, '{"a":1}'), messageDelta("end_turn"), { type: "message_stop" }]);
    const { promise, snapshots } = run();
    const result = await promise;
    expect(result).toMatchObject({ stopReason: "end_turn", text: '{"a":1}', model: "claude-opus-5-5", refusalCategory: null });
    expect(result.usage).toMatchObject({ input_tokens: 5000, output_tokens: 300 });
    expect(snapshots.at(-1)).toBe('{"a":1}');
  });

  it("fallback: teks model yang menolak dibuang dan hasil sementara direset", async () => {
    respond = sse([
      messageStart(),
      ...textBlock(0, '{"a":"DITOLAK'),
      {
        type: "content_block_start",
        index: 1,
        content_block: { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" }, trigger: { type: "refusal" } },
      },
      { type: "content_block_stop", index: 1 },
      ...textBlock(2, '{"a":"ok"}'),
      messageDelta("end_turn"),
      { type: "message_stop" },
    ]);
    const { promise, snapshots } = run();
    const result = await promise;
    expect(result.text).toBe('{"a":"ok"}');
    expect(snapshots).toContain("");
    expect(snapshots.at(-1)).toBe('{"a":"ok"}');
  });

  it("penolakan membawa kategori dari stop_details", async () => {
    respond = sse([
      messageStart(),
      messageDelta("refusal", { stop_details: { type: "refusal", category: "cyber", explanation: null } }),
      { type: "message_stop" },
    ]);
    const result = await run().promise;
    expect(result).toMatchObject({ stopReason: "refusal", refusalCategory: "cyber", text: "" });
  });

  it("dibatalkan di tengah stream → token output diperkirakan (bukan hanya 1)", async () => {
    const deltas = Array.from({ length: 50 }, () => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "x".repeat(30) } }));
    respond = sse([messageStart(), { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }, ...deltas], 5);
    const controller = new AbortController();
    const { promise } = run(controller.signal);
    setTimeout(() => controller.abort(), 120);
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiStreamError);
    const cut = error as AiStreamError;
    expect(cut.estimated).toBe(true);
    expect(cut.usage!.input_tokens).toBe(5000);
    expect(cut.usage!.output_tokens).toBeGreaterThan(1);
    expect(cut.usage!.output_tokens).toBeLessThanOrEqual(PARAMS.max_tokens);
  });

  it("gagal sebelum message_start → tanpa usage dan tanpa perkiraan", async () => {
    respond = () =>
      new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    const error = (await run().promise.catch((e: unknown) => e)) as AiStreamError;
    expect(error).toBeInstanceOf(AiStreamError);
    expect(error.usage).toBeNull();
    expect(error.estimated).toBe(false);
  });
});

describe("estimateCutUsage", () => {
  it("maks(dilaporkan, teks/3, durasi×laju), dibatasi max_tokens", () => {
    expect(estimateCutUsage(START_USAGE, { textChars: 3000, elapsedMs: 1000, maxTokens: 16_000 }).output_tokens).toBe(1000);
    expect(estimateCutUsage(START_USAGE, { textChars: 30, elapsedMs: 20_000, maxTokens: 16_000 }).output_tokens).toBe(2000);
    expect(estimateCutUsage(START_USAGE, { textChars: 0, elapsedMs: 600_000, maxTokens: 16_000 }).output_tokens).toBe(16_000);
  });
});
