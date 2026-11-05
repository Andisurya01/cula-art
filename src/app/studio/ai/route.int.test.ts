// Integrasi ke database test: Route Handler Asisten AI (NDJSON) dalam mode uji, tanpa panggilan API.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import { isAiMockMode } from "@/features/ai/client";
import { readNdjson, type AiStreamEvent } from "@/features/ai/stream-protocol";
import { POST } from "./route";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("@/features/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/ai/client")>()),
  isAiMockMode: vi.fn(() => true),
  hasAnthropicKey: vi.fn(() => false),
}));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  vi.mocked(isAiMockMode).mockReturnValue(true);
  await db.aiGuide.create({ data: { id: "default", isEnabled: true } });
});

function request(body: unknown, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new Request("http://localhost/studio/ai", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

async function events(response: Response): Promise<AiStreamEvent[]> {
  const out: AiStreamEvent[] = [];
  for await (const event of readNdjson(response.body!)) out.push(event);
  return out;
}

describe("POST /studio/ai", () => {
  it("mengalirkan partial lalu done (mode uji) dan diawali requireAdmin()", async () => {
    const response = await POST(request({ feature: "hook", input: { title: "Gambar tangan" } }));
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/x-ndjson/);
    expect(response.headers.get("cache-control")).toContain("no-transform");
    const list = await events(response);
    expect(list.some((e) => e.type === "partial")).toBe(true);
    const done = list.at(-1);
    expect(done).toMatchObject({ type: "done", mock: true, costUsd: 0 });
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ id: (done as { runId: string }).runId, status: "OK" });
  });

  it("menolak request lintas situs, JSON rusak, dan body terlalu besar", async () => {
    const cross = await POST(request({ feature: "hook", input: {} }, { headers: { "sec-fetch-site": "cross-site" } }));
    expect(cross.status).toBe(403);
    expect(await events(cross)).toEqual([{ type: "error", message: "Permintaan dari situs lain ditolak." }]);
    expect((await POST(request("{rusak"))).status).toBe(400);
    const big = await POST(request({ feature: "hook", input: { title: "x".repeat(70_000) } }));
    expect(big.status).toBe(413);
    expect(await db.aiRun.count()).toBe(0);
  });

  it("fitur tak dikenal dan instruksi terlalu panjang → event error", async () => {
    expect(await events(await POST(request({ feature: "apa", input: {} })))).toEqual([
      { type: "error", message: "Fitur AI tidak dikenal." },
    ]);
    const long = await events(await POST(request({ feature: "hook", input: { title: "x" }, instruction: "y".repeat(501) })));
    expect(long).toEqual([{ type: "error", message: "Instruksi tambahan maksimal 500 karakter" }]);
  });

  it("klien menutup koneksi di tengah streaming → panggilan dibatalkan dan dicatat", async () => {
    const controller = new AbortController();
    const response = await POST(
      request({ feature: "script", input: { title: "Reveal naga" }, instruction: "uji:lambat" }, { signal: controller.signal }),
    );
    const reader = response.body!.getReader();
    await reader.read(); // partial pertama
    controller.abort();
    await reader.cancel().catch(() => {});
    let row = null;
    for (let i = 0; i < 50 && row?.status !== "ERROR"; i++) {
      await new Promise((r) => setTimeout(r, 50));
      row = await db.aiRun.findFirst();
    }
    expect(row).toMatchObject({ status: "ERROR", errorMessage: "Dibatalkan." });
  });
});
