// Integrasi ke database test: daftar, detail (perbandingan dari H+7 saja), pilihan post, dan eksperimen per post.

import { beforeEach, describe, expect, it } from "vitest";
import type { Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, wibToUtc } from "@/lib/date";
import { getExperiment, getExperimentHypothesis, getExperiments, getExperimentsForPost } from "./queries";

const NOW = wibToUtc("2026-11-12", "20:00");
const DAY = 86_400_000;

type Snap = { kind: "H1" | "H7"; score: number };

/** Post tayang `daysAgo` hari lalu dengan snapshot berskor tepat `score` (views 1.000, likes = skor). */
async function post(title: string, options: { platform?: Platform; daysAgo: number; snaps?: Snap[]; posted?: boolean }) {
  const pillar = await db.pillar.upsert({
    where: { name: "Proses" },
    update: {},
    create: { name: "Proses", color: "#f97316" },
  });
  const posted = options.posted ?? true;
  const content = await db.content.create({
    data: {
      title,
      pillarId: pillar.id,
      stage: posted ? "POSTED" : "READY",
      posts: {
        create: {
          platform: options.platform ?? "TIKTOK",
          postType: "VIDEO",
          postedAt: posted ? new Date(NOW.getTime() - options.daysAgo * DAY) : null,
          url: posted ? "https://example.com/p" : null,
          snapshots: {
            create: (options.snaps ?? []).map((s) => ({
              kind: s.kind,
              views: 1000,
              likes: s.score,
              comments: 0,
              shares: 0,
              saves: 0,
              follows: 0,
            })),
          },
        },
      },
    },
    select: { posts: { select: { id: true } } },
  });
  return content.posts[0]!.id;
}

async function experiment(data: {
  hypothesis?: string;
  platform?: Platform;
  result?: "SUPPORTED" | "REJECTED" | "INCONCLUSIVE";
  concludedAt?: Date;
  createdAt?: Date;
  posts?: [string, "A" | "B"][];
}) {
  const row = await db.experiment.create({
    data: {
      hypothesis: data.hypothesis ?? "Hook hasil jadi lebih kuat",
      platform: data.platform ?? "TIKTOK",
      variable: "HOOK",
      variantA: "Hook proses",
      variantB: "Hook hasil jadi",
      decidingMetric: "SCORE",
      result: data.result ?? null,
      concludedAt: data.concludedAt ?? null,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      posts: { create: (data.posts ?? []).map(([postId, variant]) => ({ postId, variant })) },
    },
  });
  return row.id;
}

beforeEach(resetDatabase);

describe("getExperiment", () => {
  it("tidak ada → null", async () => {
    expect(await getExperiment("tidak-ada", NOW)).toBeNull();
    expect(await getExperimentHypothesis("tidak-ada")).toBeNull();
  });

  it("post yang hanya punya H+1 = menunggu H+7; angka H+1 tidak dipakai", async () => {
    const a1 = await post("A1", { daysAgo: 10, snaps: [{ kind: "H1", score: 50 }, { kind: "H7", score: 100 }] });
    const b1 = await post("B1", { daysAgo: 3, snaps: [{ kind: "H1", score: 900 }] });
    const id = await experiment({ posts: [[a1, "A"], [b1, "B"]] });

    const detail = await getExperiment(id, NOW);
    expect(detail?.comparison).toEqual({ status: "WAITING_H7", waitingCount: 1, total: 2 });
    expect(detail?.posts.map((p) => [p.title, p.variant, p.value, p.h1Only, p.status])).toEqual([
      ["A1", "A", 100, false, "COMPLETE"],
      ["B1", "B", null, true, "WAITING_H7"],
    ]);
    expect(detail?.counts).toEqual({ A: 1, B: 1 });
  });

  it("semua post punya H+7 → median per varian, selisih %, dan usulan; bobot dari Pengaturan", async () => {
    const ids = {
      a1: await post("A1", { daysAgo: 20, snaps: [{ kind: "H7", score: 100 }] }),
      a2: await post("A2", { daysAgo: 18, snaps: [{ kind: "H7", score: 120 }] }),
      b1: await post("B1", { daysAgo: 16, snaps: [{ kind: "H1", score: 10 }, { kind: "H7", score: 130 }] }),
      b2: await post("B2", { daysAgo: 14, snaps: [{ kind: "H7", score: 150 }] }),
    };
    const id = await experiment({
      posts: [
        [ids.a1, "A"],
        [ids.a2, "A"],
        [ids.b1, "B"],
        [ids.b2, "B"],
      ],
    });

    const detail = await getExperiment(id, NOW);
    expect(detail?.comparison).toMatchObject({
      status: "READY",
      a: { count: 2, median: 110 },
      b: { count: 2, median: 140 },
      proposal: "SUPPORTED",
      reason: "B_BETTER",
    });
    if (detail?.comparison.status !== "READY") throw new Error("harus READY");
    expect(detail.comparison.diffPercent).toBeCloseTo((30 / 110) * 100);

    // Bobot skor dari Pengaturan ikut dipakai: likes tidak dihitung → semua skor 0 → Belum jelas.
    await db.setting.update({
      where: { id: "default" },
      data: { scoreWeightsJson: JSON.stringify({ likes: 0, comments: 2, shares: 3, saves: 3, follows: 5 }) },
    });
    const reweighted = await getExperiment(id, new Date(NOW.getTime()));
    expect(reweighted?.comparison).toMatchObject({ status: "READY", a: { median: 0 }, b: { median: 0 }, proposal: "INCONCLUSIVE" });
  });

  it("pilihan post: hanya tayang di platform eksperimen, terbaru dulu, dengan varian terpilih", async () => {
    const old = await post("Lama", { daysAgo: 30 });
    const fresh = await post("Baru", { daysAgo: 0.5 });
    await post("Instagram", { daysAgo: 2, platform: "INSTAGRAM" });
    await post("Belum tayang", { daysAgo: 0, posted: false });
    const id = await experiment({ posts: [[old, "B"]] });

    const detail = await getExperiment(id, NOW);
    expect(detail?.candidates.map((c) => [c.title, c.variant, c.status])).toEqual([
      ["Baru", null, "WAITING_H1"],
      ["Lama", "B", "NEED_H7"],
    ]);
    expect(detail?.candidates[0]?.id).toBe(fresh);
  });

  it("post yang tidak tayang lagi tetap tampil tetapi tidak membuat perbandingan menunggu", async () => {
    const a = await post("A", { daysAgo: 10, snaps: [{ kind: "H7", score: 100 }] });
    const gone = await post("Ditarik", { daysAgo: 9, snaps: [{ kind: "H7", score: 100 }] });
    const id = await experiment({ posts: [[a, "A"], [gone, "B"]] });
    await db.post.update({ where: { id: gone }, data: { postedAt: null } });

    const detail = await getExperiment(id, NOW);
    expect(detail?.excludedCount).toBe(1);
    expect(detail?.posts.find((p) => p.postId === gone)).toMatchObject({ title: "Ditarik", postedAt: null, status: null });
    expect(detail?.comparison).toMatchObject({ status: "READY", proposal: "INCONCLUSIVE", reason: "NOT_ENOUGH_POSTS" });
  });
});

describe("getExperiments", () => {
  it("database kosong → dua daftar kosong", async () => {
    expect(await getExperiments(NOW)).toEqual({ running: [], finished: [] });
  });

  it("berjalan (result null, terbaru dulu) dan selesai (terakhir disimpulkan dulu), plus filter", async () => {
    const p = await post("P", { daysAgo: 3, snaps: [{ kind: "H1", score: 10 }] });
    const runOld = await experiment({ hypothesis: "Berjalan lama", createdAt: addWibDays(NOW, -10), posts: [[p, "A"]] });
    const runNew = await experiment({ hypothesis: "Berjalan baru", createdAt: addWibDays(NOW, -1) });
    const doneOld = await experiment({ hypothesis: "Selesai lama", result: "REJECTED", concludedAt: addWibDays(NOW, -5) });
    const doneNew = await experiment({ hypothesis: "Selesai baru", result: "SUPPORTED", concludedAt: addWibDays(NOW, -2) });

    const all = await getExperiments(NOW);
    expect(all.running.map((e) => e.id)).toEqual([runNew, runOld]);
    expect(all.finished.map((e) => e.id)).toEqual([doneNew, doneOld]);
    expect(all.running[1]).toMatchObject({
      counts: { A: 1, B: 0 },
      comparison: { status: "WAITING_H7", waitingCount: 1, total: 1 },
      variable: "HOOK",
      decidingMetric: "SCORE",
    });
    expect(all.running[0]?.comparison).toEqual({ status: "EMPTY" });

    const running = await getExperiments(NOW, "berjalan");
    expect(running.finished).toEqual([]);
    expect(running.running.map((e) => e.id)).toEqual([runNew, runOld]);
    const finished = await getExperiments(NOW, "selesai");
    expect(finished.running).toEqual([]);
    expect(finished.finished.map((e) => e.id)).toEqual([doneNew, doneOld]);
  });
});

describe("getExperimentsForPost", () => {
  it("eksperimen yang memakai post itu, dengan varian dan statusnya", async () => {
    const p = await post("P", { daysAgo: 3 });
    const other = await post("Lain", { daysAgo: 4 });
    const first = await experiment({ hypothesis: "Pertama", createdAt: addWibDays(NOW, -5), posts: [[p, "A"]] });
    const second = await experiment({
      hypothesis: "Kedua",
      createdAt: addWibDays(NOW, -1),
      result: "SUPPORTED",
      concludedAt: NOW,
      posts: [[p, "B"], [other, "A"]],
    });

    expect(await getExperimentsForPost(p)).toEqual([
      { id: second, hypothesis: "Kedua", variant: "B", variantDescription: "Hook hasil jadi", result: "SUPPORTED" },
      { id: first, hypothesis: "Pertama", variant: "A", variantDescription: "Hook proses", result: null },
    ]);
    expect(await getExperimentsForPost("tanpa-eksperimen")).toEqual([]);
    expect(await getExperimentHypothesis(first)).toBe("Pertama");
  });
});
