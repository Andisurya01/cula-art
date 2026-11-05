// Integrasi ke database test: runner set uji dalam mode uji (tanpa API) dan dengan SDK di-mock.

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { hasAnthropicKey, isAiMockMode, streamClaude } from "../client";
import { estimateEvalUsd, runEvals } from "./runner";

vi.mock("../client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../client")>()),
  streamClaude: vi.fn(),
  hasAnthropicKey: vi.fn(() => false),
  isAiMockMode: vi.fn(() => true),
}));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  vi.mocked(isAiMockMode).mockReturnValue(true);
  vi.mocked(hasAnthropicKey).mockReturnValue(false);
});

const options = async (extra: Partial<Parameters<typeof runEvals>[0]> = {}) => ({
  features: ["hook" as const, "caption" as const],
  model: "claude-opus-5-5" as const,
  limit: 2,
  useDbGuide: false,
  signal: new AbortController().signal,
  log: vi.fn(),
  reportDir: await mkdtemp(join(tmpdir(), "ai-eval-")),
  ...extra,
});

describe("runEvals", () => {
  it("mode uji: semua kasus jalan walau AI nonaktif, tercatat EVAL, laporan ditulis", async () => {
    await db.aiGuide.create({ data: { id: "default", isEnabled: false } });
    const { results, reportPath } = await runEvals(await options());
    expect(results.map((r) => `${r.feature}:${r.caseId}:${r.ok}`)).toEqual([
      "hook:c01:true",
      "hook:c02:true",
      "caption:c01:true",
      "caption:c02:true",
    ]);
    const runs = await db.aiRun.findMany();
    expect(runs).toHaveLength(4);
    expect(runs.every((r) => r.targetType === "EVAL" && r.model === "mock")).toBe(true);
    const report = await readFile(reportPath!, "utf8");
    expect(report).toContain("# Set uji Asisten AI");
    expect(report).toContain("### c01 · Hari ke-N lengkap · OK");
    expect(streamClaude).not.toHaveBeenCalled();
  });

  it("berhenti saat batas harian tercapai (panggilan berikutnya pasti ditolak)", async () => {
    await db.aiGuide.create({ data: { id: "default", dailyCallLimit: 1 } });
    const { results } = await runEvals(await options());
    expect(results.map((r) => r.ok)).toEqual([true, false]);
    expect(results[1]!.error).toMatch(/Batas 1 panggilan/);
  });

  it("tanpa kunci API dan bukan mode uji → ditolak sebelum memanggil apa pun", async () => {
    vi.mocked(isAiMockMode).mockReturnValue(false);
    await expect(runEvals(await options())).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(await db.aiRun.count()).toBe(0);
  });

  it("perkiraan biaya mengikuti harga model", () => {
    expect(estimateEvalUsd({ hook: 10 }, "claude-opus-5-5")).toBeCloseTo(0.4, 6);
    expect(estimateEvalUsd({ hook: 10 }, "claude-sonnet-5-5")).toBeCloseTo(0.2, 6);
  });
});
