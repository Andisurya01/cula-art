import { describe, expect, it } from "vitest";
import { DEFAULT_POSTING_SLOTS } from "@/features/settings/schema";
import { addWibDays, wibToUtc } from "@/lib/date";
import {
  defaultPlanPlatforms,
  existingPlanIds,
  isPlanCandidate,
  planOptions,
  planSlots,
  planWeekStart,
  type PlanContentRow,
  type PlanVersion,
} from "./plan";

// Minggu 8 Nov 2026 19.00 WIB (review minggu 2 Nov, rencana minggu 9 Nov).
const NOW = wibToUtc("2026-11-08", "19:00");
const PILLAR = { name: "Proses Clay", color: "#f97316" };

function row(id: string, stage: PlanContentRow["stage"], posts: PlanVersion[] = [], daysInStage = 1): PlanContentRow {
  return { id, title: `Konten ${id}`, stage, stageChangedAt: addWibDays(NOW, -daysInStage), pillar: PILLAR, posts };
}

const version = (platform: PlanVersion["platform"], scheduledAt: Date | null, postedAt: Date | null = null) => ({
  platform,
  scheduledAt,
  postedAt,
});

describe("planWeekStart", () => {
  it("minggu setelah minggu yang di-review", () => {
    expect(planWeekStart(wibToUtc("2026-11-02"))).toEqual(wibToUtc("2026-11-09"));
    expect(planWeekStart(wibToUtc("2025-12-29"))).toEqual(wibToUtc("2026-01-05"));
  });
});

describe("isPlanCandidate", () => {
  it("belum tayang dan belum terjadwal di masa depan", () => {
    expect(isPlanCandidate(row("a", "READY"), NOW)).toBe(true);
    expect(isPlanCandidate(row("a", "PLANNING", [version("TIKTOK", null)]), NOW)).toBe(true);
    // Jadwal yang sudah lewat tanpa tayang = belum terjadwal lagi.
    expect(isPlanCandidate(row("a", "READY", [version("TIKTOK", addWibDays(NOW, -1))]), NOW)).toBe(true);
  });

  it("Posted, ada versi tayang, atau terjadwal di masa depan → bukan kandidat", () => {
    expect(isPlanCandidate(row("a", "POSTED"), NOW)).toBe(false);
    expect(isPlanCandidate(row("a", "READY", [version("TIKTOK", null, addWibDays(NOW, -2))]), NOW)).toBe(false);
    expect(isPlanCandidate(row("a", "READY", [version("INSTAGRAM", addWibDays(NOW, 20))]), NOW)).toBe(false);
  });
});

describe("planOptions", () => {
  it("data kosong", () => {
    expect(planOptions([], NOW)).toEqual([]);
  });

  it("Siap Posting dulu, lalu Editing, Produksi, Perencanaan; yang paling lama di stage dulu; bukan kandidat terakhir", () => {
    const options = planOptions(
      [
        row("plan", "PLANNING", [], 30),
        row("ready-new", "READY", [], 1),
        row("scheduled", "READY", [version("TIKTOK", addWibDays(NOW, 2))], 9),
        row("edit", "EDITING", [], 3),
        row("ready-old", "READY", [], 10),
        row("prod", "PRODUCTION", [], 5),
      ],
      NOW,
    );
    expect(options.map((o) => o.id)).toEqual(["ready-old", "ready-new", "edit", "prod", "plan", "scheduled"]);
    expect(options.map((o) => o.candidate)).toEqual([true, true, true, true, true, false]);
    expect(options[0]).toMatchObject({ title: "Konten ready-old", pillarName: "Proses Clay", pillarColor: "#f97316" });
  });

  it("versi diurutkan TikTok lalu Instagram", () => {
    const [option] = planOptions(
      [row("a", "READY", [version("INSTAGRAM", null), version("TIKTOK", null)])],
      NOW,
    );
    expect(option!.versions.map((v) => v.platform)).toEqual(["TIKTOK", "INSTAGRAM"]);
  });
});

describe("planSlots", () => {
  const week = wibToUtc("2026-11-09");

  it("slot kosong minggu rencana (default Sel, Kam, Sab 19.00)", () => {
    const slots = planSlots(DEFAULT_POSTING_SLOTS, [], week, NOW);
    expect(slots.map((s) => s.key)).toEqual(["2026-11-10T19:00", "2026-11-12T19:00", "2026-11-14T19:00"]);
  });

  it("slot yang terisi dan yang sudah lewat tidak tampil", () => {
    const posts = [{ contentId: "a", at: wibToUtc("2026-11-10", "19:30") }];
    expect(planSlots(DEFAULT_POSTING_SLOTS, posts, week, NOW).map((s) => s.key)).toEqual([
      "2026-11-12T19:00",
      "2026-11-14T19:00",
    ]);
    const friday = wibToUtc("2026-11-13", "08:00");
    expect(planSlots(DEFAULT_POSTING_SLOTS, posts, week, friday).map((s) => s.key)).toEqual(["2026-11-14T19:00"]);
    expect(planSlots(DEFAULT_POSTING_SLOTS, [], week, wibToUtc("2026-11-16"))).toEqual([]);
  });

  it("tanpa slot posting", () => {
    expect(planSlots([], [], week, NOW)).toEqual([]);
  });
});

describe("defaultPlanPlatforms", () => {
  it("keduanya, kecuali yang sudah tayang", () => {
    expect(defaultPlanPlatforms([])).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(defaultPlanPlatforms([version("INSTAGRAM", NOW)])).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(defaultPlanPlatforms([version("TIKTOK", null, NOW)])).toEqual(["INSTAGRAM"]);
    expect(defaultPlanPlatforms([version("TIKTOK", null, NOW), version("INSTAGRAM", null, NOW)])).toEqual([]);
  });
});

describe("existingPlanIds", () => {
  it("membuang konten yang sudah dihapus dan duplikat, urutan tetap", () => {
    expect(existingPlanIds(["c", "x", "a", "c"], [{ id: "a" }, { id: "c" }])).toEqual(["c", "a"]);
    expect(existingPlanIds([], [{ id: "a" }])).toEqual([]);
    expect(existingPlanIds(["a"], [])).toEqual([]);
  });
});
