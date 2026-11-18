// Integrasi ke database test: fitur AI analisis (Draf ringkasan review, Kenapa?) dengan SDK di-mock.
// Memastikan angka dari kode, grup < 3 berlabel "data belum cukup", data rahasia tidak terkirim,
// dan tidak ada tulisan ke data Studio (hanya log AiRun).

import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, startOfWibWeek, toWibDateString } from "@/lib/date";
import { hasAnthropicKey, isAiMockMode, streamClaude, type StreamOptions, type StreamResult } from "./client";
import { mockRawOutput } from "./mock";
import type { AiContext } from "./prompts";
import { runAiFeature } from "./run";
import type { AiStreamEvent } from "./stream-protocol";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  streamClaude: vi.fn(),
  hasAnthropicKey: vi.fn(() => true),
  isAiMockMode: vi.fn(() => false),
}));

const stream = vi.mocked(streamClaude);
const SECRETS = ["6281234567890", "kontak@rahasia.test", "scrypt$16384$8$1$garam$hash", "token-hash-rahasia", "https://www.tiktok.com/@andi/video/rahasia"];

/** Balasan model: jawaban mode uji untuk konteks yang benar-benar dikirim (lolos skema). */
function replyWithMock<F extends "post-why" | "review-draft">(feature: F, contextRef: { current: AiContext<F> | null }) {
  return async (_params: BetaMessageStreamParams, options: StreamOptions): Promise<StreamResult> => {
    const text = JSON.stringify(mockRawOutput(feature, { pillars: [], formats: [], hookTypes: [] }, contextRef.current!));
    options.onText(text);
    return {
      stopReason: "end_turn",
      text,
      usage: { input_tokens: 1000, output_tokens: 400, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      model: "claude-opus-5-5",
    };
  };
}

function run<F extends "post-why" | "review-draft">(feature: F, input: unknown) {
  const events: AiStreamEvent[] = [];
  return runAiFeature(feature, input, { signal: new AbortController().signal, emit: (e) => events.push(e) }).then((outcome) => ({
    outcome,
    events,
  }));
}

async function seed() {
  await db.aiGuide.create({ data: { id: "default", isEnabled: true } });
  await db.setting.create({
    data: { id: "default", whatsapp: SECRETS[0], contactEmail: SECRETS[1], weeklyPostTarget: 3 },
  });
  const admin = await db.adminUser.create({ data: { email: "admin@galeri.test", passwordHash: SECRETS[2]! } });
  await db.session.create({
    data: { tokenHash: SECRETS[3]!, adminUserId: admin.id, expiresAt: addWibDays(new Date(), 30) },
  });
  const clay = await db.pillar.create({ data: { name: "Proses Clay", color: "#f97316" } });
  const tips = await db.pillar.create({ data: { name: "Tips dan Tutorial", color: "#22c55e" } });
  const timelapse = await db.format.create({ data: { name: "Time-lapse" } });
  return { clay, tips, timelapse };
}

/** Post tayang `daysAgo` hari lalu dengan H+7 berskor tepat `score`. */
async function posted(title: string, pillarId: string, daysAgo: number, score: number, platform: Platform = "TIKTOK", formatId?: string) {
  const content = await db.content.create({
    data: {
      title,
      stage: "POSTED",
      pillarId,
      formatId,
      hookText: `Hook ${title}`,
      posts: {
        create: {
          platform,
          postType: "VIDEO",
          postedAt: addWibDays(new Date(), -daysAgo),
          url: SECRETS[4],
          durationSec: 30,
          snapshots: { create: { kind: "H7", views: 1000, likes: score, comments: 0, shares: 0, saves: 0, follows: 0 } },
        },
      },
    },
    select: { posts: { select: { id: true } } },
  });
  return content.posts[0]!.id;
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  vi.mocked(hasAnthropicKey).mockReturnValue(true);
  vi.mocked(isAiMockMode).mockReturnValue(false);
});

describe("Kenapa? (post-why)", () => {
  it("angka dan grup dari kode, grup < 3 berlabel, tanpa data rahasia, AiRun POST, tanpa menulis data", async () => {
    const { clay, tips, timelapse } = await seed();
    for (const [i, score] of [100, 110, 90, 120, 100, 105, 95].entries()) {
      await posted(`Clay ${i}`, clay.id, 40 - i * 3, score, "TIKTOK", timelapse.id);
    }
    await posted("IG tinggi", clay.id, 20, 999, "INSTAGRAM");
    const target = await posted("Tips terbaru", tips.id, 10, 150, "TIKTOK", timelapse.id);

    const ref: { current: AiContext<"post-why"> | null } = { current: null };
    stream.mockImplementation(async (params, options) => {
      // Konteks dibangun ulang dari teks yang terkirim tidak praktis; cukup ambil dari mode uji dengan angka nyata.
      const { loadPostWhyContext } = await import("./analysis-context");
      ref.current = (await loadPostWhyContext({ postId: target })).context;
      return replyWithMock("post-why", ref)(params, options);
    });

    const before = { posts: await db.post.count(), snapshots: await db.metricSnapshot.count(), contents: await db.content.findMany() };
    const { outcome, events } = await run("post-why", { postId: target });
    expect(outcome.ok).toBe(true);
    expect(events.at(-1)?.type).toBe("done");

    const payload = JSON.stringify(stream.mock.calls[0]![0].messages);
    // Skor 150 / median 7 post sebelumnya (100) = 1,50x; angka dari kode.
    expect(payload).toContain("skor relatif 1,50x");
    expect(payload).toContain("Platform: TikTok");
    expect(payload).toContain("- Pilar Tips dan Tutorial: 0 post, data belum cukup");
    expect(payload).toContain("- Format Time-lapse: median skor relatif");
    expect(payload).toContain("Teks hook: Hook Tips terbaru");
    // Instagram tidak ikut sebagai pembanding post TikTok.
    expect(payload).not.toContain("IG tinggi");
    expect(payload).not.toContain("Reach");
    for (const secret of SECRETS) expect(JSON.stringify(stream.mock.calls[0]![0])).not.toContain(secret);

    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ feature: "post-why", targetType: "POST", targetId: target, status: "OK" });
    expect(await db.post.count()).toBe(before.posts);
    expect(await db.metricSnapshot.count()).toBe(before.snapshots);
    expect(await db.content.findMany()).toEqual(before.contents);
  });

  it("post tanpa skor relatif → pesan jelas, tidak ada panggilan dan tidak ada AiRun", async () => {
    const { clay } = await seed();
    const first = await posted("Post pertama", clay.id, 5, 100);
    const { outcome } = await run("post-why", { postId: first });
    expect(outcome).toEqual({ ok: false, error: "Post ini belum punya skor relatif, jadi belum bisa dijelaskan.", runId: undefined });
    expect(stream).not.toHaveBeenCalled();
    expect(await db.aiRun.count()).toBe(0);
  });
});

describe("Draf ringkasan (review-draft)", () => {
  it("ringkasan minggu per platform, grup < 3 berlabel, saran aktif ikut, tanpa data rahasia, tidak menulis review", async () => {
    const { clay, tips } = await seed();
    for (const [i, score] of [100, 110, 90].entries()) await posted(`Lama ${i}`, clay.id, 30 - i * 3, score);
    const lastWeek = addWibDays(startOfWibWeek(new Date()), -7);
    const inWeek = Math.round((Date.now() - addWibDays(lastWeek, 2).getTime()) / 86_400_000);
    await posted("Minggu lalu clay", clay.id, inWeek, 160);
    await posted("Minggu lalu tips", tips.id, inWeek, 70, "INSTAGRAM");

    const weekStart = toWibDateString(lastWeek);
    const ref: { current: AiContext<"review-draft"> | null } = { current: null };
    stream.mockImplementation(async (params, options) => {
      const { loadReviewDraftContext } = await import("./analysis-context");
      ref.current = (await loadReviewDraftContext({ weekStart })).context;
      return replyWithMock("review-draft", ref)(params, options);
    });

    const { outcome } = await run("review-draft", { weekStart, wins: "Clay ramai komentar." });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.output.focusNext).toHaveLength(3);

    const payload = JSON.stringify(stream.mock.calls[0]![0].messages);
    expect(payload).toContain("## TikTok (angka views TikTok saja)");
    expect(payload).toContain("## Instagram (angka reach Instagram saja)");
    expect(payload).toContain("Post terbaik minggu ini: Minggu lalu clay (1,60x)");
    expect(payload).toContain("data belum cukup");
    expect(payload).toContain("Apa yang berhasil: Clay ramai komentar.");
    expect(payload).toContain("Saran aturan yang aktif:");
    for (const secret of SECRETS) expect(JSON.stringify(stream.mock.calls[0]![0])).not.toContain(secret);

    expect(await db.aiRun.findFirstOrThrow()).toMatchObject({ feature: "review-draft", targetType: "REVIEW", targetId: weekStart });
    expect(await db.weeklyReview.count()).toBe(0);
  });

  it("minggu depan ditolak sebelum memanggil AI", async () => {
    await seed();
    const next = toWibDateString(addWibDays(startOfWibWeek(new Date()), 7));
    const { outcome } = await run("review-draft", { weekStart: next });
    expect(outcome.ok).toBe(false);
    expect(stream).not.toHaveBeenCalled();
  });

  it("mode uji (AI_MOCK) menjawab kedua fitur tanpa memanggil SDK", async () => {
    vi.mocked(isAiMockMode).mockReturnValue(true);
    const { clay } = await seed();
    for (const [i, score] of [100, 110, 90].entries()) await posted(`Lama ${i}`, clay.id, 30 - i * 3, score);
    const target = await posted("Baru", clay.id, 3, 130);
    const why = await run("post-why", { postId: target });
    const review = await run("review-draft", { weekStart: toWibDateString(addWibDays(startOfWibWeek(new Date()), -7)) });
    expect(why.outcome.ok && review.outcome.ok).toBe(true);
    expect(stream).not.toHaveBeenCalled();
    expect((await db.aiRun.findMany()).map((r) => r.model)).toEqual(["mock", "mock"]);
  });
});
