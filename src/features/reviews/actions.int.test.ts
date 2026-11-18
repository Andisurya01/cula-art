// Integrasi ke database test: aksi Simpan Review Mingguan.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, startOfWibWeek, toWibDateString, wibToUtc } from "@/lib/date";
import { requireAdmin } from "@/features/auth/dal";
import { settingCreateData } from "@/features/settings/queries";
import { saveWeeklyReview } from "./actions";
import { parseFrozenSummary, platformData } from "./summary";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Tanggal relatif terhadap jam sistem: aksi memakai `new Date()` sendiri.
const THIS_WEEK = startOfWibWeek(new Date());
const LAST_WEEK = addWibDays(THIS_WEEK, -7);
const LAST_KEY = toWibDateString(LAST_WEEK);
const at = (week: Date, day: number, time = "19:00") => wibToUtc(toWibDateString(addWibDays(week, day)), time);

const EMPTY = { wins: "", repeat: "", stop: "", focusNext: "", plannedContentIds: [] as string[] };

let pillarId = "";

/** Konten tayang dengan H+7 berskor tepat `score` (views 1.000, likes = skor) per platform. */
async function posted(title: string, posts: { platform: Platform; postedAt: Date; score: number }[]) {
  return db.content.create({
    data: {
      title,
      stage: "POSTED",
      pillarId,
      posts: {
        create: posts.map((p) => ({
          platform: p.platform,
          postType: "VIDEO" as const,
          postedAt: p.postedAt,
          snapshots: {
            create: [{ kind: "H7" as const, views: 1000, likes: p.score, comments: 0, shares: 0, saves: 0, follows: 0 }],
          },
        })),
      },
    },
    select: { id: true, posts: { select: { id: true, platform: true } } },
  });
}

async function readyContent(title: string) {
  return db.content.create({ data: { title, stage: "READY", pillarId }, select: { id: true } });
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  await db.setting.create({ data: { ...settingCreateData(), weeklyPostTarget: 2 } });
  pillarId = (await db.pillar.create({ data: { name: "Proses Clay", color: "#f97316" } })).id;
});

describe("saveWeeklyReview", () => {
  it("menyimpan refleksi + rencana, dan ringkasan dihitung di server (ringkasan client diabaikan)", async () => {
    // Pembanding TikTok: 3 post lama berskor 100, jadi skor relatif minggu lalu = skor / 100.
    for (const weeksAgo of [5, 4, 3]) {
      await posted(`Lama ${weeksAgo}`, [{ platform: "TIKTOK", postedAt: at(THIS_WEEK, -7 * weeksAgo), score: 100 }]);
    }
    const best = await posted("Naga part 1", [
      { platform: "TIKTOK", postedAt: at(LAST_WEEK, 1), score: 150 },
      { platform: "INSTAGRAM", postedAt: at(LAST_WEEK, 1, "19:30"), score: 999 },
    ]);
    const worst = await posted("Tips glasir", [{ platform: "TIKTOK", postedAt: at(LAST_WEEK, 3), score: 80 }]);
    await db.accountSnapshot.createMany({
      data: [
        { platform: "TIKTOK", date: wibToUtc(toWibDateString(addWibDays(LAST_WEEK, -1))), followers: 1000 },
        { platform: "TIKTOK", date: wibToUtc(toWibDateString(addWibDays(LAST_WEEK, 6))), followers: 1100 },
        { platform: "INSTAGRAM", date: wibToUtc(toWibDateString(addWibDays(LAST_WEEK, 6))), followers: 500 },
      ],
    });
    const plan = [(await readyContent("Naga part 2")).id, (await readyContent("Clay kucing")).id];

    const before = Date.now();
    const result = await saveWeeklyReview({
      weekStart: LAST_KEY,
      wins: "  - Naga part 1 ramai  ",
      repeat: "",
      stop: "   ",
      focusNext: "- Seri naga",
      plannedContentIds: plan,
      // Bukan bagian schema: harus diabaikan.
      summaryJson: '{"version":1,"postedCount":99}',
      summary: { postedCount: 99, target: 1 },
    });
    expect(result.ok).toBe(true);
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/studio/review");
    expect(revalidatePath).toHaveBeenCalledWith("/studio");

    const row = await db.weeklyReview.findUniqueOrThrow({ where: { weekStart: LAST_WEEK } });
    expect(row).toMatchObject({ wins: "- Naga part 1 ramai", repeat: null, stop: null, focusNext: "- Seri naga" });
    expect(row.plannedContentIds).toEqual(plan);

    const frozen = parseFrozenSummary(row.summaryJson);
    expect(frozen).not.toBeNull();
    expect(new Date(frozen!.frozenAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(frozen).toMatchObject({ weekStart: LAST_KEY, target: 2, postedCount: 2, targetMet: true });
    // TikTok dan Instagram terpisah: skor 999 Instagram tidak memengaruhi TikTok.
    expect(platformData(frozen!, "TIKTOK")).toMatchObject({
      postCount: 2,
      scoredCount: 2,
      followersStart: 1000,
      followersEnd: 1100,
      followersGained: 100,
      best: { id: best.posts.find((p) => p.platform === "TIKTOK")!.id, title: "Naga part 1", relativeScore: 1.5 },
      worst: { id: worst.posts[0]!.id, title: "Tips glasir", relativeScore: 0.8 },
    });
    expect(platformData(frozen!, "INSTAGRAM")).toMatchObject({
      postCount: 1,
      scoredCount: 0,
      followersGained: null,
      followersEnd: 500,
      best: null,
      worst: null,
    });
    expect(Array.isArray(frozen!.suggestions)).toBe(true);
  });

  it("simpan ulang memperbarui baris yang sama dan membekukan ulang angka terbaru", async () => {
    expect((await saveWeeklyReview({ ...EMPTY, weekStart: LAST_KEY, wins: "Pertama" })).ok).toBe(true);
    const first = await db.weeklyReview.findUniqueOrThrow({ where: { weekStart: LAST_WEEK } });
    expect(parseFrozenSummary(first.summaryJson)?.postedCount).toBe(0);

    await posted("Tayang belakangan", [{ platform: "INSTAGRAM", postedAt: at(LAST_WEEK, 5), score: 100 }]);
    const content = await readyContent("Rencana baru");
    const again = await saveWeeklyReview({
      ...EMPTY,
      weekStart: LAST_KEY,
      repeat: "Kedua",
      plannedContentIds: [content.id],
    });
    expect(again.ok).toBe(true);

    const rows = await db.weeklyReview.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(first.id);
    expect(rows[0]).toMatchObject({ wins: null, repeat: "Kedua", plannedContentIds: [content.id] });
    const frozen = parseFrozenSummary(rows[0]!.summaryJson);
    expect(frozen?.postedCount).toBe(1);
    expect(platformData(frozen!, "INSTAGRAM")?.postCount).toBe(1);
    expect(new Date(frozen!.frozenAt).getTime()).toBeGreaterThanOrEqual(new Date(parseFrozenSummary(first.summaryJson)!.frozenAt).getTime());
  });

  it("minggu berjalan boleh; minggu depan dan tanggal selain Senin ditolak tanpa menulis", async () => {
    expect((await saveWeeklyReview({ ...EMPTY, weekStart: toWibDateString(THIS_WEEK) })).ok).toBe(true);
    await db.weeklyReview.deleteMany();

    const next = await saveWeeklyReview({ ...EMPTY, weekStart: toWibDateString(addWibDays(THIS_WEEK, 7)) });
    expect(next).toMatchObject({ ok: false });
    const tuesday = await saveWeeklyReview({ ...EMPTY, weekStart: toWibDateString(addWibDays(LAST_WEEK, 1)) });
    expect(tuesday).toMatchObject({ ok: false });
    expect(await saveWeeklyReview({ ...EMPTY, weekStart: "2026-02-31" })).toMatchObject({ ok: false });
    expect(await db.weeklyReview.count()).toBe(0);
  });

  it("lebih dari 3 konten, duplikat, konten tidak ada, atau teks terlalu panjang ditolak", async () => {
    const ids = await Promise.all(["A", "B", "C", "D"].map(async (t) => (await readyContent(t)).id));
    const cases = [
      { ...EMPTY, weekStart: LAST_KEY, plannedContentIds: ids },
      { ...EMPTY, weekStart: LAST_KEY, plannedContentIds: [ids[0]!, ids[0]!] },
      { ...EMPTY, weekStart: LAST_KEY, plannedContentIds: [ids[0]!, "konten-hilang"] },
      { ...EMPTY, weekStart: LAST_KEY, focusNext: "x".repeat(2001) },
      { weekStart: LAST_KEY },
    ];
    for (const input of cases) expect((await saveWeeklyReview(input)).ok).toBe(false);
    expect(await db.weeklyReview.count()).toBe(0);

    expect((await saveWeeklyReview({ ...EMPTY, weekStart: LAST_KEY, plannedContentIds: ids.slice(0, 3) })).ok).toBe(true);
  });
});
