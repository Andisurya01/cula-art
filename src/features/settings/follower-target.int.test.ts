// Integrasi ke database test: aksi Target 3 bulan (D11) dan revalidate baris Setting.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { routePatterns, routes } from "@/lib/routes";
import { requireAdmin } from "@/features/auth/dal";
import { updateFollowerTarget, updateScoreWeights } from "./actions";
import { getSettings, SETTING_ID } from "./queries";
import { DEFAULT_POSTING_SLOTS } from "./schema";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const FULL_INPUT = { tiktokFollowers: "12,3K", igFollowers: "5.000", tiktokEr: "8,5", igEr: "4,25" };
const FULL_TARGET = { tiktokFollowers: 12300, igFollowers: 5000, tiktokEr: 8.5, igEr: 4.25 };

function settingRow() {
  return db.setting.findUniqueOrThrow({ where: { id: SETTING_ID } });
}

function expectSettingRowRevalidated() {
  expect(revalidatePath).toHaveBeenCalledWith(routes.studio.settings);
  expect(revalidatePath).toHaveBeenCalledWith(routes.studio.analytics);
  expect(revalidatePath).toHaveBeenCalledWith(routes.studio.posts);
  expect(revalidatePath).toHaveBeenCalledWith(routePatterns.post, "page");
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("updateFollowerTarget", () => {
  it("menyimpan target dan terbaca kembali lewat getSettings", async () => {
    const result = await updateFollowerTarget(FULL_INPUT);

    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect((await getSettings()).followerTarget).toStrictEqual(FULL_TARGET);
  });

  it("menerima angka hasil resolver form (idempoten)", async () => {
    expect((await updateFollowerTarget(FULL_TARGET)).ok).toBe(true);
    expect((await getSettings()).followerTarget).toStrictEqual(FULL_TARGET);
  });

  it("mengosongkan satu field menghapusnya dari JSON; field lain tetap", async () => {
    await updateFollowerTarget(FULL_INPUT);

    const result = await updateFollowerTarget({ ...FULL_INPUT, tiktokEr: "" });

    expect(result.ok).toBe(true);
    const row = await settingRow();
    expect(JSON.parse(row.followerTargetJson ?? "null")).toStrictEqual({
      tiktokFollowers: 12300,
      igFollowers: 5000,
      igEr: 4.25,
    });
    expect((await getSettings()).followerTarget).not.toHaveProperty("tiktokEr");
  });

  it("semua kosong tetap tersimpan dan berarti tanpa target", async () => {
    await updateFollowerTarget(FULL_INPUT);

    const result = await updateFollowerTarget({ tiktokFollowers: "", igFollowers: " ", tiktokEr: "", igEr: "" });

    expect(result.ok).toBe(true);
    expect((await getSettings()).followerTarget).toStrictEqual({});
  });

  it("input tidak valid ditolak per field dan tidak mengubah data", async () => {
    await updateFollowerTarget(FULL_INPUT);
    const before = (await settingRow()).followerTargetJson;
    vi.mocked(revalidatePath).mockClear();

    const result = await updateFollowerTarget({ ...FULL_INPUT, tiktokFollowers: "-5", igEr: "100,5" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.tiktokFollowers?.[0]).toMatch(/Isi angka/);
    expect(result.fieldErrors?.igEr?.[0]).toMatch(/maksimal 100%/);
    expect((await settingRow()).followerTargetJson).toBe(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("field Setting lain tidak tersentuh", async () => {
    const scoreWeightsJson = JSON.stringify({ likes: 2, comments: 2, shares: 2, saves: 2, follows: 2 });
    const postingSlotsJson = JSON.stringify([{ day: 1, time: "08:00" }]);
    await db.setting.create({
      data: {
        id: SETTING_ID,
        weeklyPostTarget: 5,
        scoreWeightsJson,
        postingSlotsJson,
        siteName: "Galeri Andi",
        igHandle: "andi.gambar",
        tiktokHandle: "andi.clay",
        avatarKey: "a".repeat(32) + ".webp",
      },
    });

    expect((await updateFollowerTarget(FULL_INPUT)).ok).toBe(true);

    expect(await settingRow()).toMatchObject({
      weeklyPostTarget: 5,
      scoreWeightsJson,
      postingSlotsJson,
      siteName: "Galeri Andi",
      igHandle: "andi.gambar",
      tiktokHandle: "andi.clay",
      avatarKey: "a".repeat(32) + ".webp",
    });
  });

  it("baris Setting yang belum ada dibuat dengan default", async () => {
    expect(await db.setting.count()).toBe(0);

    expect((await updateFollowerTarget({ igEr: "3" })).ok).toBe(true);

    const settings = await getSettings();
    expect(settings.followerTarget).toStrictEqual({ igEr: 3 });
    expect(settings.postingSlots).toEqual(DEFAULT_POSTING_SLOTS);
  });

  it("tanpa target tersimpan, getSettings mengembalikan objek kosong", async () => {
    expect((await getSettings()).followerTarget).toStrictEqual({});
  });

  it("me-revalidate Pengaturan, Analitik, dan Postingan beserta detailnya", async () => {
    await updateFollowerTarget(FULL_INPUT);
    expectSettingRowRevalidated();
  });

  it("tanpa login ditolak sebelum menyentuh data", async () => {
    await updateFollowerTarget(FULL_INPUT);
    const before = (await settingRow()).followerTargetJson;
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("redirect"));

    await expect(updateFollowerTarget({ igEr: "1" })).rejects.toThrow("redirect");

    expect((await settingRow()).followerTargetJson).toBe(before);
  });
});

describe("updateScoreWeights", () => {
  it("mengubah skor semua post, jadi Postingan dan detailnya ikut di-revalidate", async () => {
    const result = await updateScoreWeights({ likes: 1, comments: 2, shares: 3, saves: 3, follows: 5 });

    expect(result.ok).toBe(true);
    expectSettingRowRevalidated();
  });
});
