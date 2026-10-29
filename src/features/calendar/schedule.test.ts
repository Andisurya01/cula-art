import { describe, expect, it } from "vitest";
import {
  applyScheduleToPosts,
  applyScheduleToReady,
  defaultPlatforms,
  type CalendarPost,
  type ReadyContent,
} from "./schedule";

const at = new Date("2026-10-29T12:00:00.000Z");
const old = new Date("2026-10-20T12:00:00.000Z");

function content(versions: ReadyContent["versions"]): ReadyContent {
  return { id: "c1", title: "Naga", pillarName: "Clay", pillarColor: "#f00", versions };
}

describe("defaultPlatforms", () => {
  it("tanpa versi → TikTok + Instagram", () => {
    expect(defaultPlatforms(content([]))).toEqual(["TIKTOK", "INSTAGRAM"]);
  });

  it("hanya versi yang ada dan belum diposting", () => {
    const c = content([{ platform: "INSTAGRAM", scheduledAt: null, postedAt: null }]);
    expect(defaultPlatforms(c)).toEqual(["INSTAGRAM"]);
  });

  it("semua versi yang ada sudah diposting → platform lain yang belum", () => {
    const c = content([{ platform: "TIKTOK", scheduledAt: old, postedAt: old }]);
    expect(defaultPlatforms(c)).toEqual(["INSTAGRAM"]);
  });
});

describe("applyScheduleToPosts", () => {
  it("mengganti post lama yang belum diposting dan melewati yang sudah diposting", () => {
    const c = content([
      { platform: "TIKTOK", scheduledAt: old, postedAt: old },
      { platform: "INSTAGRAM", scheduledAt: old, postedAt: null },
    ]);
    const posts: CalendarPost[] = [
      { id: "p1", contentId: "c1", title: "Naga", platform: "TIKTOK", pillarName: "Clay", pillarColor: "#f00", at: old, posted: true },
      { id: "p2", contentId: "c1", title: "Naga", platform: "INSTAGRAM", pillarName: "Clay", pillarColor: "#f00", at: old, posted: false },
      { id: "p3", contentId: "c2", title: "Lain", platform: "INSTAGRAM", pillarName: "Clay", pillarColor: "#f00", at: old, posted: false },
    ];
    const result = applyScheduleToPosts(posts, c, ["TIKTOK", "INSTAGRAM"], at);
    expect(result.map((p) => p.id)).toEqual(["p1", "p3", "optimistic-c1-INSTAGRAM"]);
    expect(result[2].at).toBe(at);
  });
});

describe("applyScheduleToReady", () => {
  it("menambah/mengubah versi terpilih, konten lain tidak berubah", () => {
    const other = { ...content([]), id: "c2" };
    const ready = [content([{ platform: "TIKTOK", scheduledAt: old, postedAt: null }]), other];
    const result = applyScheduleToReady(ready, "c1", ["TIKTOK", "INSTAGRAM"], at);
    expect(result[0].versions).toEqual([
      { platform: "TIKTOK", scheduledAt: at, postedAt: null },
      { platform: "INSTAGRAM", scheduledAt: at, postedAt: null },
    ]);
    expect(result[1]).toBe(other);
  });
});
