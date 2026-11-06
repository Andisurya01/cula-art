import { describe, expect, it } from "vitest";
import { rangeStart } from "@/lib/analytics/kpi";
import { wibToUtc } from "@/lib/date";
import {
  isInRange,
  matchesMedium,
  selectComparison,
  selectPlatformPosts,
  toGroupingPosts,
  type SelectablePost,
} from "./select-posts";

const NOW = wibToUtc("2026-11-05", "12:00");
const WINDOW = { from: rangeStart(NOW, 7), now: NOW };

let counter = 0;
function post(overrides: Partial<SelectablePost> = {}): SelectablePost {
  counter += 1;
  return {
    id: `post-${counter}`,
    contentId: `content-${counter}`,
    title: `Konten ${counter}`,
    platform: "TIKTOK",
    postedAt: wibToUtc("2026-11-03", "19:00"),
    medium: "CLAY",
    best: { kind: "H7", views: 1000 },
    er: 5,
    score: 100,
    relativeScore: 1.2,
    ...overrides,
  };
}

describe("isInRange", () => {
  it("rentang 7 hari dimulai 00.00 WIB, hari ini dihitung sebagai hari ke-7", () => {
    expect(WINDOW.from).toEqual(wibToUtc("2026-10-30"));
    expect(isInRange({ postedAt: wibToUtc("2026-10-30", "00:00") }, WINDOW)).toBe(true);
    expect(isInRange({ postedAt: wibToUtc("2026-10-29", "23:59") }, WINDOW)).toBe(false);
  });

  it("batas atasnya `now`: jadwal yang belum tiba tidak ikut", () => {
    expect(isInRange({ postedAt: NOW }, WINDOW)).toBe(true);
    expect(isInRange({ postedAt: new Date(NOW.getTime() + 1) }, WINDOW)).toBe(false);
  });
});

describe("matchesMedium", () => {
  it("D6: konten tanpa medium hanya lolos saat Semua medium", () => {
    expect(matchesMedium({ medium: null }, null)).toBe(true);
    expect(matchesMedium({ medium: "CLAY" }, null)).toBe(true);
    expect(matchesMedium({ medium: null }, "CLAY")).toBe(false);
    expect(matchesMedium({ medium: "DRAWING" }, "CLAY")).toBe(false);
    expect(matchesMedium({ medium: "CLAY" }, "CLAY")).toBe(true);
  });
});

describe("selectPlatformPosts", () => {
  it("data kosong menghasilkan daftar kosong", () => {
    expect(selectPlatformPosts([], { platform: "TIKTOK", medium: null }, WINDOW)).toEqual([]);
  });

  it("tidak pernah mencampur platform", () => {
    const tiktok = post({ platform: "TIKTOK" });
    const instagram = post({ platform: "INSTAGRAM" });
    const all = [tiktok, instagram];
    expect(selectPlatformPosts(all, { platform: "TIKTOK", medium: null }, WINDOW)).toEqual([tiktok]);
    expect(selectPlatformPosts(all, { platform: "INSTAGRAM", medium: null }, WINDOW)).toEqual([instagram]);
  });

  it("menyaring rentang dan medium sekaligus", () => {
    const clay = post({ medium: "CLAY" });
    const noMedium = post({ medium: null });
    const old = post({ medium: "CLAY", postedAt: wibToUtc("2026-10-01") });
    const all = [clay, noMedium, old];
    expect(selectPlatformPosts(all, { platform: "TIKTOK", medium: "CLAY" }, WINDOW)).toEqual([clay]);
    expect(selectPlatformPosts(all, { platform: "TIKTOK", medium: null }, WINDOW)).toEqual([clay, noMedium]);
  });

  it("D4: skor relatif tidak dihitung ulang setelah menyaring", () => {
    const kept = post({ relativeScore: 1.75, score: 42 });
    const [selected] = selectPlatformPosts([kept], { platform: "TIKTOK", medium: null }, WINDOW);
    expect(selected).toBe(kept);
    expect(selected.relativeScore).toBe(1.75);
  });
});

describe("toGroupingPosts", () => {
  const refs = {
    pillar: { id: "p", name: "Proses Clay" },
    format: null,
    hookType: null,
  };

  it("data kosong menghasilkan daftar kosong", () => {
    expect(toGroupingPosts([])).toEqual([]);
  });

  it("post tanpa skor tidak ikut, skor 0 dari `views = 0` tetap ikut", () => {
    const posts = [null, 0, 80].map((score) => ({ ...post({ score }), ...refs }));
    expect(toGroupingPosts(posts).map((p) => p.score)).toEqual([0, 80]);
  });
});

describe("selectComparison", () => {
  function pair(contentId: string, overrides: { tiktok?: Partial<SelectablePost>; instagram?: Partial<SelectablePost>; both?: Partial<SelectablePost> } = {}) {
    return [
      post({ contentId, title: contentId, platform: "TIKTOK", ...overrides.both, ...overrides.tiktok }),
      post({ contentId, title: contentId, platform: "INSTAGRAM", ...overrides.both, ...overrides.instagram }),
    ];
  }

  it("data kosong menghasilkan daftar kosong", () => {
    expect(selectComparison([], null, WINDOW)).toEqual([]);
  });

  it("angka tiap sisi tetap milik platformnya, termasuk `views = 0`", () => {
    const rows = selectComparison(
      pair("a", {
        tiktok: { best: { kind: "H7", views: 12000 }, er: 8, relativeScore: 1.5 },
        instagram: { best: { kind: "H1", views: 0 }, er: 0, relativeScore: null },
      }),
      null,
      WINDOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tiktok).toMatchObject({ views: 12000, er: 8, relativeScore: 1.5, kind: "H7" });
    expect(rows[0].instagram).toMatchObject({ views: 0, er: 0, relativeScore: null, kind: "H1" });
  });

  it("hanya konten yang tayang di kedua platform dan punya skor di keduanya", () => {
    const single = post({ contentId: "single" });
    const unmeasured = pair("unmeasured", { instagram: { best: null, er: null, score: null, relativeScore: null } });
    expect(selectComparison([single, ...unmeasured], null, WINDOW)).toEqual([]);
  });

  it("masuk rentang jika salah satu versinya tayang dalam rentang", () => {
    const oneInside = pair("inside", { instagram: { postedAt: wibToUtc("2026-09-01") } });
    const bothOutside = pair("outside", { both: { postedAt: wibToUtc("2026-09-01") } });
    expect(selectComparison([...oneInside, ...bothOutside], null, WINDOW).map((r) => r.contentId)).toEqual(["inside"]);
  });

  it("mengikuti filter medium; konten tanpa medium hanya saat Semua medium", () => {
    const posts = [
      ...pair("clay", { both: { medium: "CLAY" } }),
      ...pair("drawing", { both: { medium: "DRAWING" } }),
      ...pair("none", { both: { medium: null } }),
    ];
    expect(selectComparison(posts, "CLAY", WINDOW).map((r) => r.contentId)).toEqual(["clay"]);
    expect(selectComparison(posts, null, WINDOW)).toHaveLength(3);
  });

  it("tidak membawa agregat lintas platform", () => {
    const [row] = selectComparison(pair("a"), null, WINDOW);
    expect(Object.keys(row).sort()).toEqual(["contentId", "instagram", "tiktok", "title"]);
  });
});
