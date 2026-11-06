// Integrasi ke database test: aturan unik snapshot, validasi aksi, dan angka terhitung di query.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { wibToUtc } from "@/lib/date";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import {
  deleteAccountSnapshot,
  deleteMetricSnapshot,
  saveAccountSnapshots,
  saveMetricSnapshot,
} from "./actions";
import { getFollowerSnapshots, getLatestFollowerSnapshots, getScoredPost, getScoredPosts } from "./queries";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const METRICS = {
  views: "12,3K",
  likes: "1.000",
  comments: "100",
  shares: "20",
  saves: "30",
  follows: "5",
  avgWatchSec: "",
  completionRate: "",
};

async function createPost(
  options: { title?: string; platform?: "TIKTOK" | "INSTAGRAM"; postedAt?: Date | null } = {},
) {
  const pillar = await db.pillar.upsert({
    where: { name: "Proses Clay" },
    update: {},
    create: { name: "Proses Clay", color: "#f97316" },
  });
  const content = await db.content.create({
    data: {
      title: options.title ?? "Konten uji",
      pillarId: pillar.id,
      stage: "POSTED",
      posts: {
        create: {
          platform: options.platform ?? "TIKTOK",
          postType: "VIDEO",
          postedAt: options.postedAt === undefined ? new Date("2026-10-01T12:00:00Z") : options.postedAt,
          url: "https://example.com/post",
        },
      },
    },
    select: { id: true, posts: { select: { id: true } } },
  });
  return { contentId: content.id, postId: content.posts[0].id };
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("saveMetricSnapshot", () => {
  it("menyimpan angka hasil parse, source MANUAL, recordedAt otomatis, dan me-revalidate semua menu", async () => {
    const { postId, contentId } = await createPost();
    const before = Date.now();

    expect(await saveMetricSnapshot({ postId, kind: "H1", ...METRICS })).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalledTimes(1);

    const row = await db.metricSnapshot.findFirstOrThrow({ where: { postId } });
    expect(row).toMatchObject({ kind: "H1", views: 12300, likes: 1000, comments: 100, source: "MANUAL", avgWatchSec: null });
    expect(row.recordedAt.getTime()).toBeGreaterThanOrEqual(before);

    for (const path of [routes.studio.home, routes.studio.posts, routes.studio.analytics, routes.studio.content(contentId)]) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it("satu per post + kind: simpan kedua mengubah baris yang sama", async () => {
    const { postId } = await createPost();
    await saveMetricSnapshot({ postId, kind: "H1", ...METRICS });
    await saveMetricSnapshot({ postId, kind: "H1", ...METRICS, views: "999" });

    const rows = await db.metricSnapshot.findMany({ where: { postId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(999);
  });

  it("H1 dan H7 boleh berdampingan", async () => {
    const { postId } = await createPost();
    await saveMetricSnapshot({ postId, kind: "H1", ...METRICS });
    await saveMetricSnapshot({ postId, kind: "H7", ...METRICS });
    expect(await db.metricSnapshot.count({ where: { postId } })).toBe(2);
  });

  it("simpan bersamaan tidak membuat duplikat", async () => {
    const { postId } = await createPost();
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => saveMetricSnapshot({ postId, kind: "H7", ...METRICS, views: String(i + 1) })),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.metricSnapshot.count({ where: { postId, kind: "H7" } })).toBe(1);
  });

  it("post belum tayang dan post tidak ada ditolak", async () => {
    const { postId } = await createPost({ postedAt: null });
    const notPosted = await saveMetricSnapshot({ postId, kind: "H1", ...METRICS });
    expect(notPosted).toMatchObject({ ok: false, error: expect.stringMatching(/belum tayang/) });

    const missing = await saveMetricSnapshot({ postId: "tidak-ada", kind: "H1", ...METRICS });
    expect(missing).toMatchObject({ ok: false, error: "Post tidak ditemukan" });
    expect(await db.metricSnapshot.count()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("input tidak valid ditolak dengan error per field; CUSTOM tidak bisa lewat form", async () => {
    const { postId } = await createPost();
    const invalid = await saveMetricSnapshot({ postId, kind: "H1", ...METRICS, views: "", completionRate: "120" });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.fieldErrors?.views?.[0]).toBe("Wajib diisi");
    expect(invalid.fieldErrors?.completionRate?.[0]).toMatch(/maksimal 100/);

    expect((await saveMetricSnapshot({ postId, kind: "CUSTOM", ...METRICS })).ok).toBe(false);
    expect(await db.metricSnapshot.count()).toBe(0);
  });

  it("likes > views tetap tersimpan", async () => {
    const { postId } = await createPost();
    const result = await saveMetricSnapshot({ postId, kind: "H1", ...METRICS, views: "10", likes: "20" });
    expect(result.ok).toBe(true);
  });
});

describe("aturan unik di database", () => {
  it("H1 dan H7 ganda ditolak index parsial; CUSTOM boleh banyak", async () => {
    const { postId } = await createPost();
    await db.metricSnapshot.create({ data: { postId, kind: "H1" } });
    await expect(db.metricSnapshot.create({ data: { postId, kind: "H1" } })).rejects.toMatchObject({ code: "P2002" });

    await db.metricSnapshot.create({ data: { postId, kind: "CUSTOM" } });
    await db.metricSnapshot.create({ data: { postId, kind: "CUSTOM" } });
    expect(await db.metricSnapshot.count({ where: { postId, kind: "CUSTOM" } })).toBe(2);
  });

  it("externalId unik per platform; boleh kosong di banyak post; platform lain boleh sama", async () => {
    const a = await createPost({ title: "A" });
    const b = await createPost({ title: "B" });
    const c = await createPost({ title: "C", platform: "INSTAGRAM" });
    await db.post.update({ where: { id: a.postId }, data: { externalId: "123" } });
    await expect(db.post.update({ where: { id: b.postId }, data: { externalId: "123" } })).rejects.toMatchObject({
      code: "P2002",
    });
    await db.post.update({ where: { id: c.postId }, data: { externalId: "123" } });
    expect(await db.post.count({ where: { externalId: null } })).toBe(1);
  });
});

describe("deleteMetricSnapshot", () => {
  it("menghapus dan me-revalidate; id tidak ada ditolak", async () => {
    const { postId, contentId } = await createPost();
    await saveMetricSnapshot({ postId, kind: "H1", ...METRICS });
    const { id } = await db.metricSnapshot.findFirstOrThrow({ where: { postId } });
    vi.mocked(revalidatePath).mockClear();

    expect((await deleteMetricSnapshot({ id })).ok).toBe(true);
    expect(await db.metricSnapshot.count()).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith(routes.studio.content(contentId));

    expect(await deleteMetricSnapshot({ id })).toMatchObject({ ok: false });
  });
});

describe("saveAccountSnapshots", () => {
  it("menyimpan per platform sebagai 00.00 WIB; platform kosong dilewati", async () => {
    const result = await saveAccountSnapshots({ date: "2026-10-05", TIKTOK: "1,2rb", INSTAGRAM: "" });
    expect(result.ok).toBe(true);
    const rows = await db.accountSnapshot.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ platform: "TIKTOK", followers: 1200, source: "MANUAL", date: wibToUtc("2026-10-05") });
    expect(revalidatePath).toHaveBeenCalledWith(routes.studio.analytics);
  });

  it("tanggal yang sama menimpa, bukan menambah", async () => {
    await saveAccountSnapshots({ date: "2026-10-05", TIKTOK: "100", INSTAGRAM: "200" });
    await saveAccountSnapshots({ date: "2026-10-05", TIKTOK: "150", INSTAGRAM: "" });
    const rows = await db.accountSnapshot.findMany({ orderBy: { platform: "asc" } });
    expect(rows.map((r) => [r.platform, r.followers])).toEqual([
      ["TIKTOK", 150],
      ["INSTAGRAM", 200],
    ]);
  });

  it("masa depan dan tanpa angka ditolak", async () => {
    const future = await saveAccountSnapshots({ date: "2099-01-01", TIKTOK: "100", INSTAGRAM: "" });
    expect(future).toMatchObject({ ok: false, error: expect.stringMatching(/masa depan/) });
    const empty = await saveAccountSnapshots({ date: "2026-10-05", TIKTOK: "", INSTAGRAM: "" });
    expect(empty).toMatchObject({ ok: false });
    expect(await db.accountSnapshot.count()).toBe(0);
  });

  it("bisa dihapus", async () => {
    await saveAccountSnapshots({ date: "2026-10-05", TIKTOK: "100", INSTAGRAM: "" });
    const { id } = await db.accountSnapshot.findFirstOrThrow();
    expect((await deleteAccountSnapshot({ id })).ok).toBe(true);
    expect(await db.accountSnapshot.count()).toBe(0);
    expect((await deleteAccountSnapshot({ id })).ok).toBe(false);
  });
});

describe("getScoredPosts", () => {
  const NOW = new Date("2026-11-05T12:00:00Z");

  it("data kosong → kosong", async () => {
    expect(await getScoredPosts(NOW)).toEqual([]);
  });

  it("hanya post tayang; status, snapshot yang dipakai, dan angka terhitung", async () => {
    await createPost({ title: "Belum tayang", postedAt: null });
    const { postId } = await createPost({ title: "Tayang" });
    await saveMetricSnapshot({ postId, kind: "H1", ...METRICS, views: "1000", likes: "1", comments: "0", shares: "0", saves: "0", follows: "0" });

    let rows = await getScoredPosts(NOW);
    expect(rows.map((r) => r.title)).toEqual(["Tayang"]);
    expect(rows[0]).toMatchObject({ status: "NEED_H7", best: { kind: "H1", views: 1000 }, er: 0.1, score: 1 });

    await saveMetricSnapshot({ postId, kind: "H7", ...METRICS, views: "2000", likes: "2", comments: "0", shares: "0", saves: "0", follows: "0" });
    rows = await getScoredPosts(NOW);
    expect(rows[0]).toMatchObject({ status: "COMPLETE", best: { kind: "H7", views: 2000 } });
  });

  it("views = 0 → semua angka 0, bukan NaN", async () => {
    const { postId } = await createPost();
    await saveMetricSnapshot({ postId, kind: "H7", ...METRICS, views: "0" });
    const [row] = await getScoredPosts(NOW);
    expect(row).toMatchObject({ er: 0, saveRate: 0, shareRate: 0, followRate: 0, score: 0, relativeScore: null });
  });

  it("memakai bobot skor dari Setting", async () => {
    await db.setting.create({
      data: { id: "default", scoreWeightsJson: JSON.stringify({ likes: 2, comments: 0, shares: 0, saves: 0, follows: 0 }) },
    });
    const { postId } = await createPost();
    await saveMetricSnapshot({ postId, kind: "H7", ...METRICS, views: "1000", likes: "10" });
    expect((await getScoredPosts(NOW))[0].score).toBe(20);
  });

  it("skor relatif per platform dan medium dari proyek lalu ide", async () => {
    const pillar = await db.pillar.create({ data: { name: "Pilar", color: "#000000" } });
    const project = await db.project.create({ data: { title: "Proyek", medium: "CLAY" } });
    const idea = await db.idea.create({ data: { title: "Ide", medium: "DRAWING" } });
    const contents = await Promise.all([
      db.content.create({ data: { title: "proyek+ide", pillarId: pillar.id, projectId: project.id, ideaId: idea.id } }),
    ]);
    const withIdea = await db.idea.create({ data: { title: "Ide 2", medium: "MIXED" } });
    const ideaContent = await db.content.create({ data: { title: "ide", pillarId: pillar.id, ideaId: withIdea.id } });
    const plain = await db.content.create({ data: { title: "polos", pillarId: pillar.id } });

    const day = (n: number) => new Date(`2026-10-0${n}T12:00:00Z`);
    const make = (contentId: string, platform: "TIKTOK" | "INSTAGRAM", n: number) =>
      db.post.create({
        data: {
          contentId,
          platform,
          postType: platform === "TIKTOK" ? "VIDEO" : "REEL",
          postedAt: day(n),
          snapshots: { create: { kind: "H7", views: 1000, likes: 10 * n } },
        },
      });
    await make(contents[0].id, "TIKTOK", 1);
    await make(ideaContent.id, "TIKTOK", 2);
    await make(plain.id, "TIKTOK", 3);
    await make(contents[0].id, "INSTAGRAM", 4);

    const rows = await getScoredPosts(NOW);
    const byKey = new Map(rows.map((r) => [`${r.title}:${r.platform}`, r]));
    expect(byKey.get("proyek+ide:TIKTOK")?.medium).toBe("CLAY");
    expect(byKey.get("ide:TIKTOK")?.medium).toBe("MIXED");
    expect(byKey.get("polos:TIKTOK")?.medium).toBeNull();
    // Satu-satunya post Instagram tidak punya pembanding walau TikTok punya tiga post.
    expect(byKey.get("proyek+ide:INSTAGRAM")).toMatchObject({ baselineCount: 0, relativeScore: null });
  });

  it("getScoredPost: post belum tayang → null", async () => {
    const posted = await createPost({ title: "Tayang" });
    const draft = await createPost({ title: "Draf", postedAt: null });
    expect((await getScoredPost(posted.postId))?.title).toBe("Tayang");
    expect(await getScoredPost(draft.postId)).toBeNull();
  });
});

describe("snapshot followers di query", () => {
  it("riwayat per platform dan snapshot terakhir", async () => {
    await saveAccountSnapshots({ date: "2026-10-01", TIKTOK: "100", INSTAGRAM: "500" });
    await saveAccountSnapshots({ date: "2026-10-08", TIKTOK: "150", INSTAGRAM: "" });

    const tiktok = await getFollowerSnapshots({ platform: "TIKTOK" });
    expect(tiktok.map((r) => r.followers)).toEqual([100, 150]);
    const recent = await getFollowerSnapshots({ from: wibToUtc("2026-10-05") });
    expect(recent.map((r) => r.followers)).toEqual([150]);

    expect(await getLatestFollowerSnapshots()).toEqual([
      { platform: "TIKTOK", date: wibToUtc("2026-10-08"), followers: 150 },
      { platform: "INSTAGRAM", date: wibToUtc("2026-10-01"), followers: 500 },
    ]);
  });

  it("belum ada snapshot → tanggal dan followers null", async () => {
    expect(await getLatestFollowerSnapshots()).toEqual([
      { platform: "TIKTOK", date: null, followers: null },
      { platform: "INSTAGRAM", date: null, followers: null },
    ]);
  });
});
