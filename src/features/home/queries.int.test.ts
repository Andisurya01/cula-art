// Integrasi ke database test: data Beranda dari query sampai hasil fungsi murni.

import { beforeEach, describe, expect, it } from "vitest";
import type { ContentStage, Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, wibToUtc } from "@/lib/date";
import { settingCreateData } from "@/features/settings/queries";
import { getHomeOverview, PENDING_METRICS_LIMIT } from "./queries";

// Kamis 5 Nov 2026, 12.00 WIB. Minggu berjalan mulai Senin 2 Nov.
const NOW = wibToUtc("2026-11-05", "12:00");
const daysAgo = (days: number) => addWibDays(NOW, -days);

const SNAPSHOT = { views: 1000, likes: 100, comments: 10, shares: 5, saves: 5, follows: 1 };

type PostInput = {
  platform?: Platform;
  scheduledAt?: Date;
  postedAt?: Date;
  snapshots?: ("H1" | "H7")[];
};

async function createContent(title: string, stage: ContentStage, posts: PostInput[]) {
  const pillar = await db.pillar.upsert({
    where: { name: "Proses Clay" },
    update: {},
    create: { name: "Proses Clay", color: "#f97316" },
  });
  return db.content.create({
    data: {
      title,
      stage,
      pillarId: pillar.id,
      posts: {
        create: posts.map(({ platform = "TIKTOK", scheduledAt, postedAt, snapshots = [] }) => ({
          platform,
          postType: "VIDEO" as const,
          scheduledAt,
          postedAt,
          snapshots: { create: snapshots.map((kind) => ({ kind, ...SNAPSHOT })) },
        })),
      },
    },
    select: { id: true, posts: { select: { id: true } } },
  });
}

beforeEach(resetDatabase);

describe("getHomeOverview: data kosong", () => {
  it("tanpa data: semua daftar kosong, angka 0, dan tidak ada yang gagal", async () => {
    const data = await getHomeOverview(NOW);

    expect(data.target).toBe(3);
    expect(data.weekStart).toEqual(wibToUtc("2026-11-02"));
    expect(data.weekItems).toEqual([]);
    expect(data.progress).toEqual({ posted: 0, scheduled: 0, remaining: 3, postedRatio: 0, scheduledRatio: 0 });
    expect(data.streak).toEqual({ current: 0, thisWeekCount: 0, thisWeekMet: false });
    expect(data.tasks).toEqual([]);
    expect(data.pendingMetrics).toEqual([]);
    expect(data.pendingTotal).toBe(0);
    expect(data.followerCards).toEqual([
      { platform: "TIKTOK", points: [], latest: null, gained: null },
      { platform: "INSTAGRAM", points: [], latest: null, gained: null },
    ]);
    expect(data.followerReminders).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(data.stageCounts).toEqual({ PLANNING: 0, PRODUCTION: 0, EDITING: 0, READY: 0, POSTED: 0 });
    expect(data.staleContents).toEqual([]);
    expect(data.newIdeaCount).toBe(0);
  });
});

describe("getHomeOverview: progres minggu ini", () => {
  it("dihitung per konten: tayang dan terjadwal terpisah, minggu lain tidak ikut", async () => {
    await createContent("Dua platform tayang", "POSTED", [
      { platform: "TIKTOK", postedAt: wibToUtc("2026-11-03", "19:00") },
      { platform: "INSTAGRAM", postedAt: wibToUtc("2026-11-03", "20:00") },
    ]);
    await createContent("Terjadwal Sabtu", "READY", [{ scheduledAt: wibToUtc("2026-11-07", "19:00") }]);
    await createContent("Minggu lalu", "POSTED", [{ postedAt: wibToUtc("2026-11-01", "23:59") }]);
    await createContent("Minggu depan", "READY", [{ scheduledAt: wibToUtc("2026-11-09", "00:00") }]);

    const data = await getHomeOverview(NOW);

    expect(data.weekItems.map((item) => item.title)).toEqual(["Dua platform tayang", "Terjadwal Sabtu"]);
    expect(data.weekItems[0].platforms).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(data.progress).toMatchObject({ posted: 1, scheduled: 1, remaining: 1 });
  });
});

describe("getHomeOverview: tugas hari ini (D7)", () => {
  it("lewat jadwal maks. 7 hari, hari ini, dan ≤ 2 hari lagi yang belum siap", async () => {
    await createContent("Lewat 2 hari", "EDITING", [{ scheduledAt: daysAgo(2) }]);
    await createContent("Lewat tadi pagi, sudah siap", "READY", [{ scheduledAt: wibToUtc("2026-11-05", "08:00") }]);
    await createContent("Lewat 8 hari", "EDITING", [{ scheduledAt: wibToUtc("2026-10-28", "23:59") }]);
    await createContent("Nanti malam", "READY", [{ scheduledAt: wibToUtc("2026-11-05", "23:59") }]);
    await createContent("Nanti sore, masih produksi", "PRODUCTION", [{ scheduledAt: wibToUtc("2026-11-05", "16:00") }]);
    await createContent("Lusa belum siap", "PRODUCTION", [{ scheduledAt: wibToUtc("2026-11-07", "23:00") }]);
    await createContent("Lusa sudah siap", "READY", [{ scheduledAt: wibToUtc("2026-11-07", "23:00") }]);
    await createContent("3 hari lagi", "PLANNING", [{ scheduledAt: wibToUtc("2026-11-08", "00:00") }]);
    await createContent("Sudah tayang", "POSTED", [{ scheduledAt: daysAgo(1), postedAt: daysAgo(1) }]);
    await createContent("Tanpa jadwal", "PLANNING", [{}]);

    const { tasks } = await getHomeOverview(NOW);

    expect(tasks.map(({ title, kind, notReady, stage }) => ({ title, kind, notReady, stage }))).toEqual([
      { title: "Lewat 2 hari", kind: "OVERDUE", notReady: true, stage: "EDITING" },
      { title: "Lewat tadi pagi, sudah siap", kind: "OVERDUE", notReady: false, stage: "READY" },
      { title: "Nanti sore, masih produksi", kind: "TODAY", notReady: true, stage: "PRODUCTION" },
      { title: "Nanti malam", kind: "TODAY", notReady: false, stage: "READY" },
      { title: "Lusa belum siap", kind: "NOT_READY", notReady: true, stage: "PRODUCTION" },
    ]);
  });

  it("satu konten di dua platform = satu baris; versi yang sudah tayang tidak ikut", async () => {
    const both = await createContent("Dua platform", "READY", [
      { platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-05", "19:00") },
      { platform: "INSTAGRAM", scheduledAt: wibToUtc("2026-11-05", "18:00") },
    ]);
    await createContent("IG menyusul", "POSTED", [
      { platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-05", "09:00"), postedAt: wibToUtc("2026-11-05", "09:00") },
      { platform: "INSTAGRAM", scheduledAt: wibToUtc("2026-11-05", "20:00") },
    ]);

    const { tasks } = await getHomeOverview(NOW);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      contentId: both.id,
      kind: "TODAY",
      at: wibToUtc("2026-11-05", "18:00"),
    });
    expect([...tasks[0].platforms].sort()).toEqual(["INSTAGRAM", "TIKTOK"]);
    expect(tasks[1]).toMatchObject({ title: "IG menyusul", platforms: ["INSTAGRAM"], notReady: false });
  });
});

describe("getHomeOverview: metrik tertunda", () => {
  it("hanya status Perlu, jenis form sesuai D3, H+1 lebih dulu", async () => {
    await createContent("Perlu H+7", "POSTED", [{ postedAt: daysAgo(10), snapshots: ["H1"] }]);
    await createContent("Perlu H+1", "POSTED", [{ postedAt: daysAgo(2) }]);
    await createContent("Belum 24 jam", "POSTED", [{ postedAt: daysAgo(0.5) }]);
    await createContent("Sudah H+1, belum 7 hari", "POSTED", [{ postedAt: daysAgo(3), snapshots: ["H1"] }]);
    await createContent("Lengkap", "POSTED", [{ postedAt: daysAgo(20), snapshots: ["H1", "H7"] }]);
    await createContent("Belum tayang", "READY", [{ scheduledAt: daysAgo(10) }]);

    const data = await getHomeOverview(NOW);

    expect(data.pendingTotal).toBe(2);
    expect(data.pendingMetrics.map(({ post, status, kind }) => ({ title: post.title, status, kind }))).toEqual([
      { title: "Perlu H+1", status: "NEED_H1", kind: "H1" },
      { title: "Perlu H+7", status: "NEED_H7", kind: "H7" },
    ]);
    // Snapshot H+1 ikut dikirim, supaya form bisa menandai dan mengubahnya.
    expect(data.pendingMetrics[1].post.snapshots.map((s) => s.kind)).toEqual(["H1"]);
  });

  it("dibatasi 8 baris, total tetap menghitung semua, tiap versi platform terpisah", async () => {
    for (let i = 0; i < PENDING_METRICS_LIMIT; i++) {
      await createContent(`Post ${i}`, "POSTED", [{ postedAt: daysAgo(2 + i / 10) }]);
    }
    await createContent("Dua platform", "POSTED", [
      { platform: "TIKTOK", postedAt: daysAgo(6) },
      { platform: "INSTAGRAM", postedAt: daysAgo(5.9) },
    ]);

    const data = await getHomeOverview(NOW);

    expect(PENDING_METRICS_LIMIT).toBe(8);
    expect(data.pendingTotal).toBe(10);
    expect(data.pendingMetrics).toHaveLength(8);
    expect(data.pendingMetrics.slice(0, 2).map(({ post }) => post.platform)).toEqual(["TIKTOK", "INSTAGRAM"]);
  });
});

describe("getHomeOverview: streak (D9)", () => {
  async function postedInWeek(monday: string, count: number, label: string) {
    for (let i = 0; i < count; i++) {
      await createContent(`${label} ${i}`, "POSTED", [
        { postedAt: wibToUtc(monday, "19:00"), snapshots: ["H1", "H7"] },
      ]);
    }
  }

  beforeEach(async () => {
    await db.setting.create({ data: { ...settingCreateData(), weeklyPostTarget: 2 } });
  });

  it("minggu berjalan belum memenuhi target tidak memutus streak; minggu kurang memutusnya", async () => {
    await postedInWeek("2026-11-02", 1, "Minggu ini");
    await postedInWeek("2026-10-26", 2, "Minggu lalu");
    await postedInWeek("2026-10-19", 3, "Dua minggu lalu");
    await postedInWeek("2026-10-12", 1, "Tiga minggu lalu");
    await postedInWeek("2026-10-05", 2, "Empat minggu lalu");

    const { streak, target } = await getHomeOverview(NOW);

    expect(target).toBe(2);
    expect(streak).toEqual({ current: 2, thisWeekCount: 1, thisWeekMet: false });
  });

  it("minggu berjalan yang memenuhi target menambah streak", async () => {
    await postedInWeek("2026-11-02", 2, "Minggu ini");
    await postedInWeek("2026-10-26", 2, "Minggu lalu");

    const { streak } = await getHomeOverview(NOW);

    expect(streak).toEqual({ current: 2, thisWeekCount: 2, thisWeekMet: true });
  });

  it("dihitung per konten: TikTok + Instagram untuk konten yang sama = satu post", async () => {
    await createContent("Dua platform", "POSTED", [
      { platform: "TIKTOK", postedAt: wibToUtc("2026-10-26", "19:00") },
      { platform: "INSTAGRAM", postedAt: wibToUtc("2026-10-27", "19:00") },
    ]);

    const { streak } = await getHomeOverview(NOW);

    expect(streak.current).toBe(0);
  });
});

describe("getHomeOverview: followers", () => {
  it("per platform dalam 30 hari, selisih dari snapshot dalam rentang, pengingat hanya yang lama", async () => {
    await db.accountSnapshot.createMany({
      data: [
        { platform: "TIKTOK", date: wibToUtc("2026-10-06"), followers: 1 }, // sehari di luar 30 hari
        { platform: "TIKTOK", date: wibToUtc("2026-10-07"), followers: 1000 },
        { platform: "TIKTOK", date: wibToUtc("2026-11-04"), followers: 1250 },
        { platform: "INSTAGRAM", date: wibToUtc("2026-10-29"), followers: 500 }, // tepat 7 hari lalu
      ],
    });

    const data = await getHomeOverview(NOW);

    expect(data.followerCards).toEqual([
      {
        platform: "TIKTOK",
        points: [
          { t: wibToUtc("2026-10-07").getTime(), value: 1000 },
          { t: wibToUtc("2026-11-04").getTime(), value: 1250 },
        ],
        latest: 1250,
        gained: 250,
      },
      {
        platform: "INSTAGRAM",
        points: [{ t: wibToUtc("2026-10-29").getTime(), value: 500 }],
        latest: 500,
        gained: null,
      },
    ]);
    expect(data.followerDomain).toEqual([wibToUtc("2026-10-07").getTime(), wibToUtc("2026-11-05").getTime()]);
    expect(data.followerReminders).toEqual(["INSTAGRAM"]);
    expect(data.latestFollowers).toEqual([
      { platform: "TIKTOK", date: wibToUtc("2026-11-04"), followers: 1250 },
      { platform: "INSTAGRAM", date: wibToUtc("2026-10-29"), followers: 500 },
    ]);
  });
});

describe("getHomeOverview: kartu lama", () => {
  it("jumlah per stage, konten macet, dan ide Baru", async () => {
    const old = await createContent("Macet", "EDITING", [{}]);
    await db.content.update({ where: { id: old.id }, data: { stageChangedAt: daysAgo(9) } });
    const posted = await createContent("Sudah tayang lama", "POSTED", [{}]);
    await db.content.update({ where: { id: posted.id }, data: { stageChangedAt: daysAgo(30) } });
    const fresh = await createContent("Baru pindah", "EDITING", [{}]);
    await db.content.update({ where: { id: fresh.id }, data: { stageChangedAt: NOW } });
    await db.idea.createMany({
      data: [
        { title: "Ide baru", status: "NEW" },
        { title: "Ide arsip", status: "ARCHIVED" },
      ],
    });

    const data = await getHomeOverview(NOW);

    expect(data.stageCounts).toMatchObject({ EDITING: 2, POSTED: 1, PLANNING: 0 });
    expect(data.staleContents.map((c) => c.title)).toEqual(["Macet"]);
    expect(data.newIdeaCount).toBe(1);
  });
});
