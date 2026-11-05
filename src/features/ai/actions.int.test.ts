// Integrasi ke database test: aksi Panduan AI dan penanda "draf dipakai".

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import { markAiRunAccepted, saveAiGuideContent, saveAiTechnicalSettings } from "./actions";
import { EMPTY_VOICE } from "./guide-schema";
import { getAiGuide, getAiSettingsPageData, getAiStatus } from "./queries";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("Panduan AI", () => {
  it("baris default: AI nonaktif, Opus 5.5, US$10, 100/hari", async () => {
    expect(await getAiGuide()).toMatchObject({
      isEnabled: false,
      model: "claude-opus-5-5",
      monthlyBudgetUsd: 10,
      dailyCallLimit: 100,
    });
  });

  it("menyimpan isi panduan (JSON tervalidasi) dan pengaturan teknis", async () => {
    const content = {
      voice: { ...EMPTY_VOICE, formality: "CASUAL", greeting: " kalian " },
      voiceNotes: "",
      examples: [{ kind: "CAPTION", platform: "INSTAGRAM", text: "Contoh caption" }],
      creatorFacts: "Clay polimer",
      hashtagSets: { general: { TIKTOK: ["#gambar"], INSTAGRAM: [] }, pillars: { p1: { TIKTOK: [], INSTAGRAM: ["#clay"] } } },
      avoidNotes: null,
    };
    expect(await saveAiGuideContent(content)).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalledTimes(1);

    expect(await saveAiTechnicalSettings({ isEnabled: true, model: "claude-sonnet-5-5", monthlyBudgetUsd: 5, dailyCallLimit: 20 })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/studio", "layout");

    const guide = await getAiGuide();
    expect(guide).toMatchObject({
      isEnabled: true,
      model: "claude-sonnet-5-5",
      monthlyBudgetUsd: 5,
      dailyCallLimit: 20,
      voiceNotes: null,
      creatorFacts: "Clay polimer",
    });
    expect(guide.voice.greeting).toBe("kalian");
    expect(guide.hashtagSets.pillars.p1!.INSTAGRAM).toEqual(["#clay"]);
    expect((await getAiStatus()).enabled).toBe(true);
  });

  it("input tidak valid ditolak tanpa mengubah data", async () => {
    const result = await saveAiTechnicalSettings({ isEnabled: true, model: "gpt-x", monthlyBudgetUsd: 10, dailyCallLimit: 100 });
    expect(result.ok).toBe(false);
    expect(await db.aiGuide.count()).toBe(0);
  });
});

describe("markAiRunAccepted dan pemakaian", () => {
  it("hanya run OK yang bisa ditandai dipakai; ringkasan bulan ini ikut berubah", async () => {
    const okRun = await db.aiRun.create({ data: { feature: "hook", model: "m", promptVersion: "v", status: "OK", costUsd: 0.05 } });
    const errRun = await db.aiRun.create({ data: { feature: "hook", model: "m", promptVersion: "v", status: "ERROR" } });

    expect(await markAiRunAccepted({ runId: okRun.id })).toEqual({ ok: true, data: undefined });
    expect((await markAiRunAccepted({ runId: errRun.id })).ok).toBe(false);
    expect((await markAiRunAccepted({ runId: "" })).ok).toBe(false);

    const page = await getAiSettingsPageData();
    expect(page.usage).toMatchObject({ calls: 2, okCalls: 1, acceptedCalls: 1, acceptedPercent: 100, costUsd: 0.05 });
    expect(page.recentRuns).toHaveLength(2);
    expect(page).not.toHaveProperty("apiKey");
  });
});
