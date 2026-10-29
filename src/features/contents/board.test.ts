import { describe, expect, it } from "vitest";
import {
  cardPlatforms,
  getCardSchedule,
  groupCardsByStage,
  hasPublishedPost,
  moveCard,
  restoreCard,
  sortColumnCards,
  type CardPost,
  type PipelineCard,
} from "./board";

const now = new Date("2026-10-28T05:00:00Z");
const d = (iso: string) => new Date(iso);

function post(partial: Partial<CardPost> = {}): CardPost {
  return {
    platform: "TIKTOK",
    postType: "VIDEO",
    scheduledAt: null,
    postedAt: null,
    url: null,
    ...partial,
  };
}

function card(partial: Partial<PipelineCard> = {}): PipelineCard {
  return {
    id: "c1",
    title: "Konten",
    stage: "PLANNING",
    stageChangedAt: d("2026-10-20T00:00:00Z"),
    createdAt: d("2026-10-01T00:00:00Z"),
    seriesPart: null,
    pillar: { id: "p1", name: "Proses Clay", color: "#f97316" },
    format: null,
    posts: [],
    ...partial,
  };
}

describe("hasPublishedPost", () => {
  it("butuh URL dan waktu posting", () => {
    expect(hasPublishedPost([])).toBe(false);
    expect(hasPublishedPost([post({ url: "https://x.com" })])).toBe(false);
    expect(hasPublishedPost([post({ postedAt: now })])).toBe(false);
    expect(hasPublishedPost([post({ postedAt: now, url: "  " })])).toBe(false);
    expect(hasPublishedPost([post({ postedAt: now, url: "https://x.com" })])).toBe(true);
  });
});

describe("getCardSchedule", () => {
  it("null jika tidak ada jadwal", () => {
    expect(getCardSchedule("PLANNING", [], now)).toBeNull();
    expect(getCardSchedule("POSTED", [post()], now)).toBeNull();
  });

  it("memilih jadwal terdekat yang akan datang", () => {
    const posts = [
      post({ scheduledAt: d("2026-11-02T12:00:00Z") }),
      post({ platform: "INSTAGRAM", scheduledAt: d("2026-10-30T12:00:00Z") }),
      post({ scheduledAt: d("2026-10-25T12:00:00Z") }),
    ];
    expect(getCardSchedule("READY", posts, now)).toEqual({
      kind: "upcoming",
      at: d("2026-10-30T12:00:00Z"),
    });
  });

  it("mengabaikan versi yang sudah diposting", () => {
    const posts = [
      post({ scheduledAt: d("2026-10-29T12:00:00Z"), postedAt: d("2026-10-29T12:00:00Z") }),
    ];
    expect(getCardSchedule("READY", posts, now)).toBeNull();
  });

  it("overdue jika semua jadwal sudah lewat", () => {
    const posts = [
      post({ scheduledAt: d("2026-10-20T12:00:00Z") }),
      post({ scheduledAt: d("2026-10-26T12:00:00Z") }),
    ];
    expect(getCardSchedule("READY", posts, now)).toEqual({
      kind: "overdue",
      at: d("2026-10-26T12:00:00Z"),
    });
  });

  it("stage POSTED menampilkan waktu posting paling awal", () => {
    const posts = [
      post({ postedAt: d("2026-10-27T12:00:00Z") }),
      post({ platform: "INSTAGRAM", postedAt: d("2026-10-26T12:00:00Z") }),
    ];
    expect(getCardSchedule("POSTED", posts, now)).toEqual({
      kind: "posted",
      at: d("2026-10-26T12:00:00Z"),
    });
  });
});

describe("cardPlatforms", () => {
  it("urut TikTok lalu Instagram tanpa duplikat", () => {
    expect(cardPlatforms([{ platform: "INSTAGRAM" }, { platform: "TIKTOK" }])).toEqual([
      "TIKTOK",
      "INSTAGRAM",
    ]);
    expect(cardPlatforms([])).toEqual([]);
  });
});

describe("sortColumnCards", () => {
  it("jadwal terdekat dulu, tanpa jadwal di bawah urut paling lama di kolom", () => {
    const a = card({ id: "a", stageChangedAt: d("2026-10-10T00:00:00Z") });
    const b = card({ id: "b", posts: [post({ scheduledAt: d("2026-11-01T00:00:00Z") })] });
    const c = card({ id: "c", posts: [post({ scheduledAt: d("2026-10-29T00:00:00Z") })] });
    const e = card({ id: "e", stageChangedAt: d("2026-10-05T00:00:00Z") });
    expect(sortColumnCards([a, b, c, e], "READY").map((x) => x.id)).toEqual(["c", "b", "e", "a"]);
  });

  it("Posted: terbaru dulu", () => {
    const a = card({ id: "a", stage: "POSTED", stageChangedAt: d("2026-10-10T00:00:00Z") });
    const b = card({ id: "b", stage: "POSTED", stageChangedAt: d("2026-10-20T00:00:00Z") });
    expect(sortColumnCards([a, b], "POSTED").map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("tidak mengubah array asli", () => {
    const list = [card({ id: "a" }), card({ id: "b" })];
    sortColumnCards(list, "POSTED");
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("groupCardsByStage", () => {
  it("semua stage ada walau kosong", () => {
    const groups = groupCardsByStage([card({ id: "a", stage: "EDITING" })]);
    expect(Object.keys(groups)).toEqual(["PLANNING", "PRODUCTION", "EDITING", "READY", "POSTED"]);
    expect(groups.EDITING.map((x) => x.id)).toEqual(["a"]);
    expect(groups.PLANNING).toEqual([]);
  });
});

describe("moveCard / restoreCard", () => {
  it("memindah stage dan memperbarui stageChangedAt", () => {
    const list = [card({ id: "a" }), card({ id: "b" })];
    const moved = moveCard(list, "a", "PRODUCTION", now);
    expect(moved[0]).toMatchObject({ stage: "PRODUCTION", stageChangedAt: now });
    expect(moved[1]).toBe(list[1]);
  });

  it("stage sama → tidak berubah", () => {
    const list = [card({ id: "a" })];
    expect(moveCard(list, "a", "PLANNING", now)[0]).toBe(list[0]);
  });

  it("rollback mengembalikan stage sebelumnya", () => {
    const original = card({ id: "a" });
    const moved = moveCard([original], "a", "EDITING", now);
    const restored = restoreCard(moved, "a", {
      stage: original.stage,
      stageChangedAt: original.stageChangedAt,
    });
    expect(restored[0]).toMatchObject({
      stage: "PLANNING",
      stageChangedAt: original.stageChangedAt,
    });
  });
});
