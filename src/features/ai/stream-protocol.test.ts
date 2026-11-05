import { describe, expect, it } from "vitest";
import { readNdjson, type AiStreamEvent } from "./stream-protocol";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<AiStreamEvent[]> {
  const events: AiStreamEvent[] = [];
  for await (const event of readNdjson(streamOf(chunks))) events.push(event);
  return events;
}

describe("readNdjson", () => {
  it("menyusun baris yang terpotong di beberapa chunk dan melewati baris rusak", async () => {
    const events = await collect([
      '{"type":"partial","data":{"a":',
      '1}}\n{rusak}\n{"type":"lain"}\n',
      '{"type":"error","message":"gagal"}',
    ]);
    expect(events).toEqual([
      { type: "partial", data: { a: 1 } },
      { type: "error", message: "gagal" },
    ]);
  });

  it("karakter multibyte terbelah di antara chunk tetap utuh", async () => {
    const bytes = new TextEncoder().encode('{"type":"error","message":"héllo ✓"}\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 32));
        controller.enqueue(bytes.slice(32));
        controller.close();
      },
    });
    const events: AiStreamEvent[] = [];
    for await (const event of readNdjson(stream)) events.push(event);
    expect(events).toEqual([{ type: "error", message: "héllo ✓" }]);
  });
});
