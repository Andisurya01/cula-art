// Integrasi ke database test: aksi Eksperimen (buat, ubah, post per varian, kesimpulan, buka lagi, hapus).

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Platform } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import {
  concludeExperiment,
  createExperiment,
  deleteExperiment,
  removeExperimentPost,
  reopenExperiment,
  setExperimentPost,
  updateExperiment,
} from "./actions";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const INPUT = {
  hypothesis: "Hook hasil jadi menaikkan save rate",
  platform: "TIKTOK" as Platform,
  variable: "HOOK",
  variantA: "Hook proses",
  variantB: "Hook hasil jadi",
  decidingMetric: "SAVE_RATE",
};

let seq = 0;
/** Konten + satu post. `posted: false` = belum tayang. */
async function post(platform: Platform = "TIKTOK", posted = true) {
  seq += 1;
  const pillar = await db.pillar.upsert({
    where: { name: "Proses" },
    update: {},
    create: { name: "Proses", color: "#f97316" },
  });
  const content = await db.content.create({
    data: {
      title: `Konten ${seq}`,
      pillarId: pillar.id,
      stage: posted ? "POSTED" : "READY",
      posts: {
        create: {
          platform,
          postType: platform === "TIKTOK" ? "VIDEO" : "REEL",
          postedAt: posted ? new Date(Date.now() - 2 * 86_400_000) : null,
          url: posted ? "https://example.com/p" : null,
        },
      },
    },
    select: { posts: { select: { id: true } } },
  });
  return content.posts[0]!.id;
}

async function experiment(patch: Partial<typeof INPUT> = {}) {
  const result = await createExperiment({ ...INPUT, ...patch });
  if (!result.ok) throw new Error(result.error);
  return result.data.id;
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("createExperiment / updateExperiment", () => {
  it("membuat eksperimen berjalan dan me-revalidate daftar, detail, dan detail post", async () => {
    const id = await experiment();
    expect(requireAdmin).toHaveBeenCalled();
    expect(await db.experiment.findUniqueOrThrow({ where: { id } })).toMatchObject({
      ...INPUT,
      result: null,
      concludedAt: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/studio/eksperimen");
    expect(revalidatePath).toHaveBeenCalledWith("/studio/eksperimen/[id]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/studio/postingan/[id]", "page");
  });

  it("input tidak sah ditolak tanpa menulis", async () => {
    expect((await createExperiment({ ...INPUT, variable: "CAPTION" })).ok).toBe(false);
    expect((await createExperiment({ ...INPUT, variantB: INPUT.variantA })).ok).toBe(false);
    expect(await db.experiment.count()).toBe(0);
  });

  it("platform hanya boleh diganti selama belum ada post", async () => {
    const id = await experiment();
    expect(await updateExperiment({ ...INPUT, id, platform: "INSTAGRAM", hypothesis: "Baru" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await db.experiment.findUniqueOrThrow({ where: { id } })).toMatchObject({
      platform: "INSTAGRAM",
      hypothesis: "Baru",
    });

    const ig = await post("INSTAGRAM");
    expect((await setExperimentPost({ experimentId: id, postId: ig, variant: "A" })).ok).toBe(true);
    const locked = await updateExperiment({ ...INPUT, id, platform: "TIKTOK" });
    expect(locked.ok).toBe(false);
    expect(locked.ok ? "" : locked.error).toContain("Platform tidak bisa diganti");

    // Teks tetap bisa diubah selama platform sama.
    expect((await updateExperiment({ ...INPUT, id, platform: "INSTAGRAM", variantB: "Cover wajah" })).ok).toBe(true);
    expect((await updateExperiment({ ...INPUT, id: "tidak-ada" })).ok).toBe(false);
  });
});

describe("setExperimentPost / removeExperimentPost", () => {
  it("post platform lain dan post belum tayang ditolak", async () => {
    const id = await experiment();
    const ig = await post("INSTAGRAM");
    const draft = await post("TIKTOK", false);

    const wrongPlatform = await setExperimentPost({ experimentId: id, postId: ig, variant: "A" });
    expect(wrongPlatform).toEqual({
      ok: false,
      error: "Post ini di Instagram, sedangkan eksperimen ini di TikTok.",
    });
    const notPosted = await setExperimentPost({ experimentId: id, postId: draft, variant: "B" });
    expect(notPosted.ok ? "" : notPosted.error).toContain("belum tayang");
    expect((await setExperimentPost({ experimentId: id, postId: "tidak-ada", variant: "B" })).ok).toBe(false);
    expect((await setExperimentPost({ experimentId: "tidak-ada", postId: ig, variant: "B" })).ok).toBe(false);
    expect(await db.experimentPost.count()).toBe(0);
  });

  it("satu post satu varian: menambah lagi ke varian lain = pindah", async () => {
    const id = await experiment();
    const p = await post();

    expect(await setExperimentPost({ experimentId: id, postId: p, variant: "A" })).toEqual({
      ok: true,
      data: { previous: null },
    });
    expect(await setExperimentPost({ experimentId: id, postId: p, variant: "B" })).toEqual({
      ok: true,
      data: { previous: "A" },
    });
    expect(await setExperimentPost({ experimentId: id, postId: p, variant: "B" })).toEqual({
      ok: true,
      data: { previous: "B" },
    });
    expect(await db.experimentPost.findMany({ select: { postId: true, variant: true } })).toEqual([
      { postId: p, variant: "B" },
    ]);

    // Post yang sama boleh dipakai eksperimen lain.
    const other = await experiment({ hypothesis: "Lain" });
    expect((await setExperimentPost({ experimentId: other, postId: p, variant: "A" })).ok).toBe(true);
    expect(await db.experimentPost.count()).toBe(2);
  });

  it("lepas post; post dan metriknya tetap ada", async () => {
    const id = await experiment();
    const p = await post();
    await setExperimentPost({ experimentId: id, postId: p, variant: "A" });

    expect((await removeExperimentPost({ experimentId: id, postId: p })).ok).toBe(true);
    expect(await db.experimentPost.count()).toBe(0);
    expect(await db.post.count({ where: { id: p } })).toBe(1);
    expect((await removeExperimentPost({ experimentId: id, postId: p })).ok).toBe(false);
  });
});

describe("concludeExperiment / reopenExperiment", () => {
  it("menyimpan hasil + catatan + concludedAt, mengunci post, lalu buka lagi mengosongkan hasil", async () => {
    const id = await experiment();
    const p = await post();
    await setExperimentPost({ experimentId: id, postId: p, variant: "A" });

    const before = Date.now();
    expect((await concludeExperiment({ id, result: "SUPPORTED", notes: "  Hook hasil menang  " })).ok).toBe(true);
    const concluded = await db.experiment.findUniqueOrThrow({ where: { id } });
    expect(concluded).toMatchObject({ result: "SUPPORTED", notes: "Hook hasil menang" });
    expect(concluded.concludedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);

    // Selesai = post tidak bisa ditambah, dipindah, atau dilepas.
    const p2 = await post();
    expect((await setExperimentPost({ experimentId: id, postId: p2, variant: "B" })).ok).toBe(false);
    expect((await setExperimentPost({ experimentId: id, postId: p, variant: "B" })).ok).toBe(false);
    expect((await removeExperimentPost({ experimentId: id, postId: p })).ok).toBe(false);

    expect((await reopenExperiment({ id })).ok).toBe(true);
    expect(await db.experiment.findUniqueOrThrow({ where: { id } })).toMatchObject({
      result: null,
      concludedAt: null,
      notes: "Hook hasil menang",
    });
    expect((await setExperimentPost({ experimentId: id, postId: p2, variant: "B" })).ok).toBe(true);

    // Catatan kosong disimpan null.
    expect((await concludeExperiment({ id, result: "INCONCLUSIVE", notes: "" })).ok).toBe(true);
    expect((await db.experiment.findUniqueOrThrow({ where: { id } })).notes).toBeNull();
  });

  it("hasil tidak sah atau eksperimen tidak ada ditolak", async () => {
    const id = await experiment();
    expect((await concludeExperiment({ id, result: "MUNGKIN", notes: "" })).ok).toBe(false);
    expect((await concludeExperiment({ id: "tidak-ada", result: "REJECTED", notes: "" })).ok).toBe(false);
    expect((await reopenExperiment({ id: "tidak-ada" })).ok).toBe(false);
    expect((await db.experiment.findUniqueOrThrow({ where: { id } })).result).toBeNull();
  });
});

describe("deleteExperiment", () => {
  it("menghapus eksperimen dan hubungan post-nya (cascade); post tetap ada", async () => {
    const id = await experiment();
    const keep = await experiment({ hypothesis: "Tetap" });
    const a = await post();
    const b = await post();
    await setExperimentPost({ experimentId: id, postId: a, variant: "A" });
    await setExperimentPost({ experimentId: id, postId: b, variant: "B" });
    await setExperimentPost({ experimentId: keep, postId: a, variant: "B" });

    expect((await deleteExperiment({ id })).ok).toBe(true);
    expect(await db.experiment.findMany({ select: { id: true } })).toEqual([{ id: keep }]);
    expect(await db.experimentPost.findMany({ select: { experimentId: true, postId: true } })).toEqual([
      { experimentId: keep, postId: a },
    ]);
    expect(await db.post.count()).toBe(2);
    expect((await deleteExperiment({ id })).ok).toBe(false);
  });
});
