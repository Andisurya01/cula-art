import { describe, expect, it } from "vitest";
import type { Platform } from "@prisma/client";
import { DEFAULT_SCORE_WEIGHTS, type MetricInput } from "@/lib/analytics/metrics";
import type { MetricStatus } from "@/lib/analytics/snapshots";
import {
  buildExperimentData,
  countByVariant,
  h7Metrics,
  postCandidates,
  searchCandidates,
  toDecidingMetric,
  toExperimentVariable,
  type ExperimentLink,
  type ScoredPostLike,
} from "./derive";

const DAY = 86_400_000;
const BASE = new Date("2026-11-01T12:00:00Z");

/** Skor tepat `score` dengan bobot default (likes per 1.000 views). */
const metrics = (score: number, views = 1000): MetricInput => ({
  views,
  likes: (score * views) / 1000,
  comments: 0,
  shares: 0,
  saves: 0,
  follows: 0,
});

function scored(
  id: string,
  options: { platform?: Platform; daysAgo?: number; h1?: number; h7?: number; status?: MetricStatus; title?: string } = {},
): ScoredPostLike {
  const snapshots = [
    ...(options.h1 !== undefined ? [{ kind: "H1" as const, ...metrics(options.h1) }] : []),
    ...(options.h7 !== undefined ? [{ kind: "H7" as const, ...metrics(options.h7) }] : []),
  ];
  return {
    id,
    title: options.title ?? `Post ${id}`,
    platform: options.platform ?? "TIKTOK",
    postedAt: new Date(BASE.getTime() - (options.daysAgo ?? 0) * DAY),
    url: `https://example.com/${id}`,
    status: options.status ?? (options.h7 !== undefined ? "COMPLETE" : "WAITING_H7"),
    snapshots,
  };
}

const link = (postId: string, variant: "A" | "B", platform: Platform = "TIKTOK"): ExperimentLink => ({
  postId,
  variant,
  title: `Judul DB ${postId}`,
  platform,
});

const build = (links: ExperimentLink[], posts: ScoredPostLike[], metric: "SCORE" | "VIEWS" = "SCORE") =>
  buildExperimentData({
    platform: "TIKTOK",
    metric,
    weights: DEFAULT_SCORE_WEIGHTS,
    links,
    scoredById: new Map(posts.map((p) => [p.id, p])),
  });

describe("toExperimentVariable / toDecidingMetric", () => {
  it("nilai dikenal dipertahankan, nilai asing jatuh ke cadangan", () => {
    expect(toExperimentVariable("COVER")).toBe("COVER");
    expect(toExperimentVariable("cover")).toBe("OTHER");
    expect(toDecidingMetric("FOLLOW_RATE")).toBe("FOLLOW_RATE");
    expect(toDecidingMetric("")).toBe("SCORE");
  });
});

describe("h7Metrics", () => {
  it("hanya H+7; H+1 dan CUSTOM diabaikan", () => {
    expect(h7Metrics([])).toBeNull();
    expect(h7Metrics([{ kind: "H1", ...metrics(50) }])).toBeNull();
    expect(h7Metrics([{ kind: "CUSTOM", ...metrics(50) }])).toBeNull();
    expect(h7Metrics([{ kind: "H1", ...metrics(50) }, { kind: "H7", ...metrics(80) }])).toEqual(metrics(80));
  });
});

describe("buildExperimentData", () => {
  it("tanpa post → EMPTY", () => {
    expect(build([], [])).toEqual({ posts: [], comparison: { status: "EMPTY" }, excludedCount: 0 });
  });

  it("post yang hanya punya H+1 → menunggu H+7, nilai null dan ditandai h1Only", () => {
    const data = build(
      [link("a1", "A"), link("b1", "B")],
      [scored("a1", { h7: 100 }), scored("b1", { h1: 300 })],
    );
    expect(data.comparison).toEqual({ status: "WAITING_H7", waitingCount: 1, total: 2 });
    expect(data.posts.find((p) => p.postId === "b1")).toMatchObject({ value: null, h1Only: true, status: "WAITING_H7" });
    expect(data.posts.find((p) => p.postId === "a1")).toMatchObject({ value: 100, h1Only: false });
  });

  it("semua H+7 → median per varian + usulan; H+1 tidak memengaruhi angka", () => {
    const data = build(
      [link("a1", "A"), link("a2", "A"), link("b1", "B"), link("b2", "B")],
      [
        scored("a1", { h7: 100, h1: 999, daysAgo: 4 }),
        scored("a2", { h7: 120, daysAgo: 3 }),
        scored("b1", { h7: 130, daysAgo: 2 }),
        scored("b2", { h7: 150, h1: 1, daysAgo: 1 }),
      ],
    );
    expect(data.comparison).toMatchObject({
      status: "READY",
      a: { count: 2, median: 110 },
      b: { count: 2, median: 140 },
      proposal: "SUPPORTED",
      reason: "B_BETTER",
    });
    if (data.comparison.status !== "READY") throw new Error("harus READY");
    expect(data.comparison.diffPercent).toBeCloseTo((30 / 110) * 100);
    // Urutan: varian A dulu, lalu tayang terbaru.
    expect(data.posts.map((p) => p.postId)).toEqual(["a2", "a1", "b2", "b1"]);
  });

  it("metrik VIEWS memakai views H+7 apa adanya, views 0 tetap 0", () => {
    const data = build(
      [link("a1", "A"), link("b1", "B")],
      [scored("a1", { h7: 0 }), { ...scored("b1"), snapshots: [{ kind: "H7", ...metrics(0, 0) }] }],
      "VIEWS",
    );
    expect(data.posts.map((p) => p.value)).toEqual([1000, 0]);
    expect(data.comparison).toMatchObject({ status: "READY", a: { median: 1000 }, b: { median: 0 } });
  });

  it("post yang tidak tayang lagi (atau beda platform) tampil tetapi tidak ikut perbandingan", () => {
    const data = build(
      [link("a1", "A"), link("gone", "B"), link("ig", "B", "INSTAGRAM")],
      [scored("a1", { h7: 100 }), scored("ig", { h7: 500, platform: "INSTAGRAM" })],
    );
    expect(data.excludedCount).toBe(2);
    expect(data.posts.find((p) => p.postId === "gone")).toMatchObject({
      title: "Judul DB gone",
      postedAt: null,
      status: null,
      value: null,
      h1Only: false,
    });
    expect(data.comparison).toMatchObject({ status: "READY", a: { count: 1 }, b: { count: 0, median: null } });
  });
});

describe("postCandidates", () => {
  it("hanya platform eksperimen, terbaru dulu, dengan varian yang sudah dipilih", () => {
    const list = postCandidates(
      [
        scored("old", { daysAgo: 10 }),
        scored("ig", { platform: "INSTAGRAM", daysAgo: 1 }),
        scored("new", { daysAgo: 2 }),
        scored("mid", { daysAgo: 5, status: "NEED_H7" }),
      ],
      "TIKTOK",
      [{ postId: "mid", variant: "B" }],
    );
    expect(list.map((c) => [c.id, c.variant, c.status])).toEqual([
      ["new", null, "WAITING_H7"],
      ["mid", "B", "NEED_H7"],
      ["old", null, "WAITING_H7"],
    ]);
  });

  it("tanpa post → daftar kosong", () => {
    expect(postCandidates([], "INSTAGRAM", [])).toEqual([]);
  });
});

describe("searchCandidates", () => {
  const items = [
    { title: "Time-lapse tangan Part 2" },
    { title: "Patung naga: reveal" },
    { title: "Café kecil di kota" },
  ];

  it("tanpa kata kunci → semua (dibatasi limit)", () => {
    expect(searchCandidates(items, "  ")).toEqual({ items, total: 3 });
    expect(searchCandidates(items, "", 2)).toEqual({ items: items.slice(0, 2), total: 3 });
  });

  it("tanpa beda huruf besar/kecil dan aksen; semua kata harus ada", () => {
    expect(searchCandidates(items, "NAGA").items).toEqual([items[1]]);
    expect(searchCandidates(items, "cafe").items).toEqual([items[2]]);
    expect(searchCandidates(items, "part  tangan").items).toEqual([items[0]]);
    expect(searchCandidates(items, "naga part")).toEqual({ items: [], total: 0 });
  });

  it("daftar kosong", () => {
    expect(searchCandidates([], "apa saja")).toEqual({ items: [], total: 0 });
  });
});

describe("countByVariant", () => {
  it("menghitung per varian, termasuk kosong", () => {
    expect(countByVariant([])).toEqual({ A: 0, B: 0 });
    expect(countByVariant([{ variant: "A" }, { variant: "B" }, { variant: "B" }])).toEqual({ A: 1, B: 2 });
  });
});
