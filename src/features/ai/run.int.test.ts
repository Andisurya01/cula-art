// Integrasi ke database test: alur panggilan AI dengan SDK di-mock (tidak ada panggilan API berbayar).

import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStorageKey, saveFile } from "@/lib/storage";
import { db, resetDatabase } from "@/test/db";
import { AiStreamError, hasAnthropicKey, isAiMockMode, streamClaude, type StreamOptions, type StreamResult } from "./client";
import { AI_MESSAGES } from "./errors";
import { runAiFeature } from "./run";
import type { AiStreamEvent } from "./stream-protocol";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  streamClaude: vi.fn(),
  hasAnthropicKey: vi.fn(() => true),
  isAiMockMode: vi.fn(() => false),
}));

const stream = vi.mocked(streamClaude);

const HOOKS = {
  hooks: [1, 2, 3, 4, 5].map((n) => ({ text: `Hook ${n}`, note: "Teks di layar" })),
  notes: null,
};

function reply(output: unknown, overrides: Partial<StreamResult> = {}) {
  return async (_params: BetaMessageStreamParams, options: StreamOptions): Promise<StreamResult> => {
    const text = JSON.stringify(output);
    options.onText(text.slice(0, 20));
    options.onText(text);
    return {
      stopReason: "end_turn",
      text,
      usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 },
      model: "claude-opus-5-5",
      ...overrides,
    };
  };
}

async function seed(guide: { isEnabled?: boolean; dailyCallLimit?: number; monthlyBudgetUsd?: number; model?: string } = {}) {
  await db.aiGuide.create({
    data: { id: "default", isEnabled: true, creatorFacts: "Memakai clay polimer.", ...guide },
  });
  const pillar = await db.pillar.create({ data: { name: "Progres Gambar", color: "#f00" } });
  const hookType = await db.hookType.create({ data: { name: "Hari ke-N" } });
  return { pillar, hookType };
}

const hookInput = (ids: { pillarId?: string; hookTypeId?: string } = {}) => ({
  title: "Gambar tangan hari ke-30",
  pillarId: ids.pillarId ?? null,
  hookTypeId: ids.hookTypeId ?? null,
});

function run(feature: Parameters<typeof runAiFeature>[0], input: unknown, extra: Partial<Parameters<typeof runAiFeature>[2]> = {}) {
  const events: AiStreamEvent[] = [];
  const promise = runAiFeature(feature, input, {
    signal: new AbortController().signal,
    emit: (e) => events.push(e),
    ...extra,
  });
  return promise.then((outcome) => ({ outcome, events }));
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  vi.mocked(hasAnthropicKey).mockReturnValue(true);
  vi.mocked(isAiMockMode).mockReturnValue(false);
});

describe("runAiFeature: alur sukses", () => {
  it("mengirim prompt ber-cache + structured output + fallback, mencatat AiRun OK, tanpa menulis data konten", async () => {
    const { pillar, hookType } = await seed();
    stream.mockImplementation(reply(HOOKS));

    const { outcome, events } = await run("hook", hookInput({ pillarId: pillar.id, hookTypeId: hookType.id }), {
      instruction: "lebih santai",
    });

    expect(outcome.ok).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "done", data: HOOKS, mock: false, model: "claude-opus-5-5" });
    expect(events.filter((e) => e.type === "partial").length).toBeGreaterThanOrEqual(1);

    const params = stream.mock.calls[0]![0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.output_config?.effort).toBe("medium");
    expect(params.output_config?.format?.type).toBe("json_schema");
    expect(params.thinking).toBeUndefined();
    const system = params.system as { text: string; cache_control?: unknown }[];
    expect(system).toHaveLength(1);
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[0]!.text).toContain("<panduan_ai>");
    expect(system[0]!.text).toContain("Memakai clay polimer.");
    expect(system[0]!.text).not.toContain("Gambar tangan hari ke-30"); // data per permintaan tidak di awalan cache
    const user = JSON.stringify(params.messages);
    expect(user).toContain("Judul konten: Gambar tangan hari ke-30");
    expect(user).toContain("Tipe hook: Hari ke-N");
    expect(user).toContain("lebih santai");

    const row = await db.aiRun.findFirstOrThrow();
    expect(row).toMatchObject({
      feature: "hook",
      model: "claude-opus-5-5",
      promptVersion: "hook@1+base@1",
      targetType: "CONTENT",
      status: "OK",
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 2000,
      accepted: false,
    });
    // 1000×4 + 500×20 + 2000×0,2 = 14.400 per juta
    expect(row.costUsd).toBeCloseTo(0.0144, 6);
    expect(JSON.parse(row.outputJson!)).toEqual(HOOKS);
    expect(row.durationMs).not.toBeNull();
    expect(await db.content.count()).toBe(0);
    expect(await db.idea.count()).toBe(0);
  });

  it("Haiku tidak memakai fallback server-side", async () => {
    await seed({ model: "claude-haiku-5-5" });
    stream.mockImplementation(reply(HOOKS, { model: "claude-haiku-5-5" }));
    await run("hook", hookInput());
    const params = stream.mock.calls[0]![0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.fallbacks).toBeUndefined();
    expect(params.betas).toBeUndefined();
  });

  it("mode uji: tidak memanggil SDK, biaya 0, model mock", async () => {
    vi.mocked(isAiMockMode).mockReturnValue(true);
    vi.mocked(hasAnthropicKey).mockReturnValue(false);
    await seed();
    const { outcome, events } = await run("hook", hookInput());
    expect(outcome.ok).toBe(true);
    expect(stream).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ type: "done", mock: true, costUsd: 0, model: "mock" });
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ model: "mock", status: "OK", costUsd: 0 });
  });
});

describe("runAiFeature: ditolak sebelum dikirim (tanpa AiRun)", () => {
  it("AI nonaktif, kunci belum ada, input tidak valid", async () => {
    await seed({ isEnabled: false });
    expect((await run("hook", hookInput())).outcome).toEqual({ ok: false, error: AI_MESSAGES.disabled });

    await db.aiGuide.update({ where: { id: "default" }, data: { isEnabled: true } });
    vi.mocked(hasAnthropicKey).mockReturnValue(false);
    expect((await run("hook", hookInput())).outcome).toEqual({ ok: false, error: AI_MESSAGES.noKey });

    vi.mocked(hasAnthropicKey).mockReturnValue(true);
    const invalid = await run("hook", { title: "" });
    expect(invalid.outcome.ok).toBe(false);
    expect(invalid.events).toEqual([{ type: "error", message: "Isi judul konten dulu" }]);

    expect(stream).not.toHaveBeenCalled();
    expect(await db.aiRun.count()).toBe(0);
  });

  it("batas harian (hari WIB) dan batas biaya bulanan", async () => {
    await seed({ dailyCallLimit: 2, monthlyBudgetUsd: 1 });
    await db.aiRun.create({ data: { feature: "hook", model: "m", promptVersion: "v", status: "OK", costUsd: 0.4 } });
    // Kemarin (WIB) tidak dihitung untuk batas harian, tetapi ikut biaya bulan ini jika masih bulan yang sama.
    await db.aiRun.create({
      data: { feature: "hook", model: "m", promptVersion: "v", status: "OK", createdAt: new Date(Date.now() - 36 * 3600_000) },
    });
    stream.mockImplementation(reply(HOOKS));
    expect((await run("hook", hookInput())).outcome.ok).toBe(true);
    expect((await run("hook", hookInput())).outcome).toEqual({ ok: false, error: AI_MESSAGES.dailyLimit(2) });

    await db.aiGuide.update({ where: { id: "default" }, data: { dailyCallLimit: 100 } });
    await db.aiRun.create({ data: { feature: "hook", model: "m", promptVersion: "v", status: "OK", costUsd: 0.6 } });
    expect((await run("hook", hookInput())).outcome).toEqual({ ok: false, error: AI_MESSAGES.monthlyBudget(1) });
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("5 panggilan bersamaan dengan sisa 1 slot: hanya 1 yang dikirim", async () => {
    await seed({ dailyCallLimit: 1 });
    stream.mockImplementation(async (params, options) => {
      await new Promise((r) => setTimeout(r, 50));
      return reply(HOOKS)(params, options);
    });
    const results = await Promise.all(Array.from({ length: 5 }, () => run("hook", hookInput())));
    expect(results.filter((r) => r.outcome.ok)).toHaveLength(1);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(await db.aiRun.count()).toBe(1);
  });

  it("batas bulanan: biaya terburuk dipesan, jadi panggilan paralel tidak semua lolos", async () => {
    // Biaya terburuk hook (Opus, fallback → harga termahal): ±6.000 × US$25/juta ≈ US$0,15 per panggilan.
    await seed({ monthlyBudgetUsd: 0.5 });
    await db.aiRun.create({ data: { feature: "hook", model: "m", promptVersion: "v", status: "OK", costUsd: 0.3 } });
    stream.mockImplementation(async (params, options) => {
      await new Promise((r) => setTimeout(r, 50));
      return reply(HOOKS)(params, options);
    });
    const results = await Promise.all(Array.from({ length: 5 }, () => run("hook", hookInput())));
    const sent = results.filter((r) => r.outcome.ok).length;
    expect(sent).toBeGreaterThanOrEqual(1);
    expect(sent).toBeLessThanOrEqual(2);
    expect(results.filter((r) => !r.outcome.ok).every((r) => !r.outcome.ok && r.outcome.error === AI_MESSAGES.monthlyBudget(0.5))).toBe(true);
    // Setelah selesai, biaya pesanan diganti biaya sebenarnya.
    const done = await db.aiRun.findMany({ where: { status: "OK", feature: "hook", model: "claude-opus-5-5" } });
    expect(done.every((r) => r.costUsd < 0.05)).toBe(true);
  });

  it("run RUNNING yang tertinggal > 15 menit dirapikan jadi ERROR (biaya pesanan tetap dihitung)", async () => {
    await seed();
    const stale = await db.aiRun.create({
      data: { feature: "hook", model: "claude-opus-5-5", promptVersion: "v", status: "RUNNING", costUsd: 0.2, createdAt: new Date(Date.now() - 20 * 60_000) },
    });
    const fresh = await db.aiRun.create({ data: { feature: "hook", model: "claude-opus-5-5", promptVersion: "v", status: "RUNNING", costUsd: 0.2 } });
    stream.mockImplementation(reply(HOOKS));
    await run("hook", hookInput());
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: stale.id } })).toMatchObject({ status: "ERROR", costUsd: 0.2 });
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: fresh.id } })).toMatchObject({ status: "RUNNING" });
  });

  it("klien sudah pergi sebelum reservasi → tidak memakai slot harian", async () => {
    await seed();
    const controller = new AbortController();
    controller.abort();
    const { outcome } = await run("hook", hookInput(), { signal: controller.signal });
    expect(outcome).toEqual({ ok: false, error: AI_MESSAGES.aborted });
    expect(await db.aiRun.count()).toBe(0);
    expect(stream).not.toHaveBeenCalled();
  });

  it("set uji boleh jalan saat AI nonaktif, dicatat sebagai EVAL", async () => {
    await seed({ isEnabled: false });
    stream.mockImplementation(reply(HOOKS));
    expect((await run("hook", hookInput(), { evaluation: true })).outcome.ok).toBe(true);
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ targetType: "EVAL", status: "OK" });
  });
});

describe("runAiFeature: gagal setelah dikirim (AiRun dicatat)", () => {
  it("refusal → REFUSED, kategori dicatat", async () => {
    await seed();
    stream.mockImplementation(reply({}, { stopReason: "refusal", refusalCategory: "cyber", text: "" }));
    const { outcome } = await run("hook", hookInput());
    expect(outcome).toMatchObject({ ok: false, error: AI_MESSAGES.refused });
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({
      status: "REFUSED",
      inputTokens: 1000,
      errorMessage: `${AI_MESSAGES.refused} (kategori: cyber)`,
    });
  });

  it("stream putus dengan usage perkiraan → ditandai di pesan error", async () => {
    await seed();
    stream.mockRejectedValue(
      new AiStreamError(new Anthropic.APIUserAbortError(), { input_tokens: 800, output_tokens: 2000 }, true),
    );
    await run("hook", hookInput());
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({
      status: "ERROR",
      outputTokens: 2000,
      errorMessage: "Dibatalkan. (biaya diperkirakan)",
    });
  });

  it("terpotong max_tokens dan output tidak sesuai skema → ERROR", async () => {
    await seed();
    stream.mockImplementationOnce(reply(HOOKS, { stopReason: "max_tokens" }));
    expect((await run("hook", hookInput())).outcome).toMatchObject({ error: AI_MESSAGES.truncated });
    stream.mockImplementationOnce(reply({ hooks: [{ text: "cuma satu", note: "" }], notes: null }));
    expect((await run("hook", hookInput())).outcome).toMatchObject({ error: AI_MESSAGES.invalidOutput });
    const rows = await db.aiRun.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.status)).toEqual(["ERROR", "ERROR"]);
    expect(rows[1]!.outputJson).toContain("cuma satu");
  });

  it("error SDK → pesan Indonesia, token yang terpakai tetap dicatat", async () => {
    await seed();
    stream.mockRejectedValue(
      new AiStreamError(new Anthropic.APIConnectionError({ message: "putus" }), { input_tokens: 800, output_tokens: 10 }),
    );
    const { outcome, events } = await run("hook", hookInput());
    expect(outcome).toMatchObject({ ok: false, error: expect.stringMatching(/Gagal terhubung/) });
    expect(events).toEqual([{ type: "error", message: expect.stringMatching(/Gagal terhubung/) }]);
    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ status: "ERROR", inputTokens: 800, outputTokens: 10 });
  });
});

describe("data yang dikirim ke AI", () => {
  it("Karya dari foto: foto diperkecil, hanya foto milik karya itu; tanpa harga, kontak, atau data akun", async () => {
    await seed();
    await db.setting.create({ data: { id: "default", whatsapp: "6281234567890", contactEmail: "rahasia@contoh.id" } });
    await db.adminUser.create({ data: { email: "admin@contoh.id", passwordHash: "scrypt$rahasia-hash" } });
    const big = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#884422" } }).webp().toBuffer();
    const key = generateStorageKey("webp");
    await saveFile(key, big);
    const artwork = await db.artwork.create({
      data: { title: "Kepala naga", slug: "naga", priceIdr: 7_654_321, showPrice: true, materials: "Clay polimer" },
    });
    const image = await db.artworkImage.create({ data: { artworkId: artwork.id, storageKey: key, width: 2400, height: 1600, alt: "lama" } });
    const other = await db.artwork.create({ data: { title: "Lain", slug: "lain" } });
    const otherImage = await db.artworkImage.create({ data: { artworkId: other.id, storageKey: "b".repeat(32) + ".webp", width: 1, height: 1 } });

    stream.mockImplementation(
      // Model menjawab dengan nomor foto; "2" tidak ada (foto karya lain diabaikan) dan dibuang.
      reply({
        alts: [
          { photo: "1", alt: "Kepala naga clay" },
          { photo: "2", alt: "tidak ada" },
        ],
        summary: "Naga.",
        description: "Cerita.",
        notes: null,
      }),
    );
    const { outcome } = await run("artwork-photos", {
      artworkId: artwork.id,
      imageIds: [image.id, otherImage.id],
      title: "Kepala naga",
      materials: "Clay polimer",
    });
    expect(outcome).toMatchObject({ ok: true, output: { alts: [{ imageId: image.id, alt: "Kepala naga clay" }] } });

    const params = stream.mock.calls[0]![0];
    const payload = JSON.stringify(params);
    for (const secret of ["6281234567890", "rahasia@contoh.id", "rahasia-hash", "7654321", "7.654.321", otherImage.id]) {
      expect(payload).not.toContain(secret);
    }
    const content = params.messages[0]!.content as { type: string; source?: { data: string } }[];
    const images = content.filter((b) => b.type === "image");
    expect(images).toHaveLength(1);
    const meta = await sharp(Buffer.from(images[0]!.source!.data, "base64")).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBe(1024);
    expect(await db.artworkImage.findUniqueOrThrow({ where: { id: image.id } })).toMatchObject({ alt: "lama" });
  });

  it("Karya dari foto dengan foto karya lain saja → ditolak tanpa panggilan", async () => {
    await seed();
    const artwork = await db.artwork.create({ data: { title: "A", slug: "a" } });
    const other = await db.artwork.create({ data: { title: "B", slug: "b" } });
    const img = await db.artworkImage.create({ data: { artworkId: other.id, storageKey: "c".repeat(32) + ".webp", width: 1, height: 1 } });
    const { outcome } = await run("artwork-photos", { artworkId: artwork.id, imageIds: [img.id] });
    expect(outcome).toMatchObject({ ok: false, error: expect.stringMatching(/Foto yang dipilih tidak ditemukan/) });
    expect(stream).not.toHaveBeenCalled();
    expect(await db.aiRun.count()).toBe(0);
  });
});
