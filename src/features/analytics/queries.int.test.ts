// Integrasi ke database test: platform tidak tercampur (D1), skor relatif dari riwayat penuh (D4),
// medium dari proyek lalu ide (D6), followers (D10), dan target per platform (D11).

import { beforeEach, describe, expect, it } from "vitest";
import type { Medium, Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, wibToUtc } from "@/lib/date";
import { getAnalyticsData } from "./queries";

const NOW = wibToUtc("2026-11-05", "12:00");
const IN_RANGE = wibToUtc("2026-11-03", "19:00");

type Metrics = { views: number; likes?: number };

async function createPost(options: {
  title: string;
  platform?: Platform;
  postedAt?: Date;
  metrics?: Metrics | null;
  kind?: "H1" | "H7";
  projectMedium?: Medium;
  ideaMedium?: Medium;
  contentId?: string;
}) {
  const { platform = "TIKTOK", postedAt = IN_RANGE, metrics = { views: 1000, likes: 100 }, kind = "H7" } = options;
  const pillar = await db.pillar.upsert({
    where: { name: "Proses Clay" },
    update: {},
    create: { name: "Proses Clay", color: "#f97316" },
  });
  const contentId =
    options.contentId ??
    (
      await db.content.create({
        data: {
          title: options.title,
          pillar: { connect: { id: pillar.id } },
          stage: "POSTED",
          ...(options.projectMedium
            ? { project: { create: { title: `Proyek ${options.title}`, medium: options.projectMedium } } }
            : {}),
          ...(options.ideaMedium ? { idea: { create: { title: `Ide ${options.title}`, medium: options.ideaMedium } } } : {}),
        },
        select: { id: true },
      })
    ).id;
  const post = await db.post.create({
    data: {
      contentId,
      platform,
      postType: platform === "TIKTOK" ? "VIDEO" : "REEL",
      postedAt,
      url: "https://example.com/post",
      ...(metrics ? { snapshots: { create: { kind, ...metrics } } } : {}),
    },
    select: { id: true, contentId: true },
  });
  return post;
}

const FILTERS = { platform: "TIKTOK", days: 30, medium: null } as const;

beforeEach(async () => {
  await resetDatabase();
});

describe("getAnalyticsData", () => {
  it("database kosong: tanpa error, semua bagian kosong", async () => {
    const data = await getAnalyticsData(FILTERS, NOW);
    expect(data.kpi).toMatchObject({ totalPosts: 0, averageEr: null, followersGained: null, postsPerWeek: 0 });
    expect(data.followers).toEqual([]);
    expect(data.scoredCount).toBe(0);
    expect(data.groups.pillar).toEqual([]);
    expect(data.ranking).toEqual({ top: [], bottom: [] });
    expect(data.comparison).toEqual([]);
    expect(data.target).toEqual({ followers: null, er: null });
    expect(data.currentFollowers).toBeNull();
  });

  it("D1: tab satu platform tidak membawa angka platform lain, kecuali perbandingan", async () => {
    const tiktok = await createPost({ title: "Sama", platform: "TIKTOK", metrics: { views: 1000, likes: 100 } });
    await createPost({
      title: "Sama",
      contentId: tiktok.contentId,
      platform: "INSTAGRAM",
      metrics: { views: 500, likes: 100 },
    });

    const onTiktok = await getAnalyticsData(FILTERS, NOW);
    const onInstagram = await getAnalyticsData({ ...FILTERS, platform: "INSTAGRAM" }, NOW);

    expect(onTiktok.kpi.totalPosts).toBe(1);
    expect(onTiktok.kpi.averageEr).toBeCloseTo(10);
    expect(onInstagram.kpi.totalPosts).toBe(1);
    expect(onInstagram.kpi.averageEr).toBeCloseTo(20);
    expect(onTiktok.groups.pillar[0].postCount).toBe(1);
    expect(onInstagram.groups.pillar[0].postCount).toBe(1);

    // Perbandingan sama di kedua tab: memang berisi dua platform, tiap sisi angkanya sendiri.
    for (const data of [onTiktok, onInstagram]) {
      expect(data.comparison).toHaveLength(1);
      expect(data.comparison[0].tiktok.views).toBe(1000);
      expect(data.comparison[0].instagram.views).toBe(500);
    }
  });

  it("D4: post di luar rentang tetap menjadi pembanding skor relatif, tetapi tidak dihitung", async () => {
    for (const [index, likes] of [50, 100, 150].entries()) {
      await createPost({
        title: `Lama ${index}`,
        postedAt: addWibDays(wibToUtc("2026-06-01"), index),
        metrics: { views: 1000, likes },
      });
    }
    const recent = await createPost({ title: "Baru", metrics: { views: 1000, likes: 200 } });

    const data = await getAnalyticsData(FILTERS, NOW);

    expect(data.kpi.totalPosts).toBe(1);
    // Skor = likes / views × 1000 → 200 dibanding median pembanding 100.
    expect(data.ranking.top.map((post) => post.id)).toEqual([recent.id]);
    expect(data.ranking.top[0].relativeScore).toBeCloseTo(2);
    expect(data.ranking.bottom).toEqual([]);
  });

  it("D4: pembanding kurang dari 3 post tidak masuk top/bottom", async () => {
    await createPost({ title: "Pertama", postedAt: wibToUtc("2026-10-20") });
    await createPost({ title: "Kedua", postedAt: wibToUtc("2026-10-21") });

    const data = await getAnalyticsData(FILTERS, NOW);

    expect(data.kpi.totalPosts).toBe(2);
    expect(data.scoredCount).toBe(2);
    expect(data.ranking).toEqual({ top: [], bottom: [] });
  });

  it("D6: medium dari proyek lalu ide; konten tanpa medium hanya saat Semua medium", async () => {
    await createPost({ title: "Dari proyek", projectMedium: "CLAY", ideaMedium: "DRAWING" });
    await createPost({ title: "Dari ide", ideaMedium: "CLAY" });
    await createPost({ title: "Tanpa medium" });

    expect((await getAnalyticsData(FILTERS, NOW)).kpi.totalPosts).toBe(3);
    expect((await getAnalyticsData({ ...FILTERS, medium: "CLAY" }, NOW)).kpi.totalPosts).toBe(2);
    expect((await getAnalyticsData({ ...FILTERS, medium: "DRAWING" }, NOW)).kpi.totalPosts).toBe(0);
    expect((await getAnalyticsData({ ...FILTERS, medium: "MIXED" }, NOW)).kpi.totalPosts).toBe(0);
  });

  it("post tanpa metrik dihitung sebagai post, tetapi tidak masuk ER dan median; `views = 0` tetap 0", async () => {
    await createPost({ title: "Belum diisi", metrics: null });
    await createPost({ title: "Nol", metrics: { views: 0, likes: 0 } });

    const data = await getAnalyticsData(FILTERS, NOW);

    expect(data.kpi.totalPosts).toBe(2);
    expect(data.kpi.measuredPosts).toBe(1);
    expect(data.kpi.averageEr).toBe(0);
    expect(data.scoredCount).toBe(1);
    expect(data.groups.pillar[0].medianScore).toBe(0);
  });

  it("D10: followers hanya platform aktif dan rentang aktif, tidak terpengaruh medium", async () => {
    await db.accountSnapshot.createMany({
      data: [
        { platform: "TIKTOK", date: wibToUtc("2026-08-01"), followers: 100 },
        { platform: "TIKTOK", date: wibToUtc("2026-10-20"), followers: 1000 },
        { platform: "TIKTOK", date: wibToUtc("2026-11-01"), followers: 1250 },
        { platform: "INSTAGRAM", date: wibToUtc("2026-10-25"), followers: 9000 },
      ],
    });

    const tiktok = await getAnalyticsData(FILTERS, NOW);
    expect(tiktok.followers.map((row) => row.followers)).toEqual([1000, 1250]);
    expect(tiktok.kpi.followersGained).toBe(250);
    expect(tiktok.domain).toEqual([wibToUtc("2026-10-07").getTime(), wibToUtc("2026-11-05").getTime()]);

    const clay = await getAnalyticsData({ ...FILTERS, medium: "CLAY" }, NOW);
    expect(clay.kpi.followersGained).toBe(250);

    const instagram = await getAnalyticsData({ ...FILTERS, platform: "INSTAGRAM" }, NOW);
    expect(instagram.followers.map((row) => row.followers)).toEqual([9000]);
    expect(instagram.kpi.followersGained).toBeNull();
    expect(instagram.currentFollowers).toBe(9000);
  });

  it("D11: target per platform; `sekarang` tetap terisi walau snapshot terakhir di luar rentang", async () => {
    await db.setting.create({
      data: {
        id: "default",
        postingSlotsJson: "[]",
        scoreWeightsJson: "{}",
        followerTargetJson: JSON.stringify({ tiktokFollowers: 5000, tiktokEr: 8 }),
      },
    });
    await db.accountSnapshot.create({
      data: { platform: "TIKTOK", date: wibToUtc("2026-08-01"), followers: 3400 },
    });

    const tiktok = await getAnalyticsData({ ...FILTERS, days: 7 }, NOW);
    expect(tiktok.followers).toEqual([]);
    expect(tiktok.currentFollowers).toBe(3400);
    expect(tiktok.target).toEqual({ followers: 5000, er: 8 });

    const instagram = await getAnalyticsData({ ...FILTERS, platform: "INSTAGRAM", days: 7 }, NOW);
    expect(instagram.target).toEqual({ followers: null, er: null });
    expect(instagram.currentFollowers).toBeNull();
  });
});
