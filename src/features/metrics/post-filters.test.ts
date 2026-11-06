import { describe, expect, it } from "vitest";
import type { MetricStatus } from "@/lib/analytics/snapshots";
import {
  EMPTY_POST_FILTERS,
  POSTS_PER_PAGE,
  filterPosts,
  paginate,
  parsePostFilters,
  parsePostPage,
  pillarOptions,
  postFiltersToQuery,
  type PostFilters,
} from "./post-filters";

type TestPost = {
  id: string;
  platform: "TIKTOK" | "INSTAGRAM";
  pillar: { id: string; name: string };
  status: MetricStatus;
  postedAt: Date;
};

function post(overrides: Partial<TestPost> = {}): TestPost {
  return {
    id: "p",
    platform: "TIKTOK",
    pillar: { id: "proses", name: "Proses" },
    status: "COMPLETE",
    postedAt: new Date("2026-11-05T05:00:00Z"),
    ...overrides,
  };
}

function filters(overrides: Partial<PostFilters>): PostFilters {
  return { ...EMPTY_POST_FILTERS, ...overrides };
}

describe("parsePostFilters", () => {
  it("tanpa parameter: semua kosong", () => {
    expect(parsePostFilters({})).toEqual(EMPTY_POST_FILTERS);
  });

  it("membaca semua parameter yang valid", () => {
    expect(
      parsePostFilters({
        platform: "INSTAGRAM",
        pilar: "proses",
        status: "PERLU",
        dari: "2026-11-01",
        sampai: "2026-11-30",
      }),
    ).toEqual({
      platform: "INSTAGRAM",
      pillarId: "proses",
      status: "PERLU",
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("menerima satu MetricStatus", () => {
    expect(parsePostFilters({ status: "WAITING_H7" }).status).toBe("WAITING_H7");
  });

  it("nilai tidak valid diabaikan", () => {
    expect(
      parsePostFilters({
        platform: "YOUTUBE",
        pilar: "   ",
        status: "SELESAI",
        dari: "2026-02-31",
        sampai: "besok",
      }),
    ).toEqual(EMPTY_POST_FILTERS);
  });

  it("parameter berulang: yang pertama dipakai", () => {
    expect(parsePostFilters({ platform: ["TIKTOK", "INSTAGRAM"] }).platform).toBe("TIKTOK");
  });

  it("pilar di luar daftar yang dikenal diabaikan", () => {
    expect(parsePostFilters({ pilar: "basi" }, ["proses"]).pillarId).toBeNull();
    expect(parsePostFilters({ pilar: "proses" }, ["proses"]).pillarId).toBe("proses");
    expect(parsePostFilters({ pilar: "proses" }, []).pillarId).toBeNull();
  });

  it("rentang terbalik: `sampai` diabaikan", () => {
    const parsed = parsePostFilters({ dari: "2026-11-10", sampai: "2026-11-05" });
    expect(parsed.from).toBe("2026-11-10");
    expect(parsed.to).toBeNull();
  });

  it("rentang satu hari tetap valid", () => {
    const parsed = parsePostFilters({ dari: "2026-11-05", sampai: "2026-11-05" });
    expect(parsed.to).toBe("2026-11-05");
  });
});

describe("parsePostPage", () => {
  it("nilai valid", () => {
    expect(parsePostPage({ halaman: "3" })).toBe(3);
  });

  it("nilai tidak valid menjadi 1", () => {
    for (const halaman of [undefined, "", "0", "-2", "abc", "1.5", "9".repeat(400)]) {
      expect(parsePostPage({ halaman })).toBe(1);
    }
  });
});

describe("postFiltersToQuery", () => {
  it("filter kosong dan halaman 1 tidak ditulis", () => {
    expect(postFiltersToQuery(EMPTY_POST_FILTERS)).toBe("");
    expect(postFiltersToQuery(EMPTY_POST_FILTERS, 1)).toBe("");
  });

  it("bolak-balik dengan parser", () => {
    const original = filters({
      platform: "TIKTOK",
      pillarId: "proses",
      status: "NEED_H7",
      from: "2026-11-01",
      to: "2026-11-30",
    });
    const params = Object.fromEntries(new URLSearchParams(postFiltersToQuery(original, 4)));
    expect(parsePostFilters(params)).toEqual(original);
    expect(parsePostPage(params)).toBe(4);
  });
});

describe("filterPosts", () => {
  it("data kosong", () => {
    expect(filterPosts([], filters({ platform: "TIKTOK" }))).toEqual([]);
  });

  it("tanpa filter: semua post, urutan tetap", () => {
    const posts = [post({ id: "b" }), post({ id: "a" })];
    expect(filterPosts(posts, EMPTY_POST_FILTERS).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("platform", () => {
    const posts = [post({ id: "tt" }), post({ id: "ig", platform: "INSTAGRAM" })];
    expect(filterPosts(posts, filters({ platform: "INSTAGRAM" })).map((p) => p.id)).toEqual(["ig"]);
  });

  it("pilar", () => {
    const posts = [post({ id: "a" }), post({ id: "b", pillar: { id: "tips", name: "Tips" } })];
    expect(filterPosts(posts, filters({ pillarId: "tips" })).map((p) => p.id)).toEqual(["b"]);
  });

  it("PERLU = Perlu H+1 atau Perlu H+7", () => {
    const statuses: MetricStatus[] = ["WAITING_H1", "NEED_H1", "WAITING_H7", "NEED_H7", "COMPLETE"];
    const posts = statuses.map((status) => post({ id: status, status }));
    expect(filterPosts(posts, filters({ status: "PERLU" })).map((p) => p.id)).toEqual([
      "NEED_H1",
      "NEED_H7",
    ]);
  });

  it("satu status", () => {
    const posts = [post({ id: "a", status: "NEED_H1" }), post({ id: "b", status: "NEED_H7" })];
    expect(filterPosts(posts, filters({ status: "NEED_H7" })).map((p) => p.id)).toEqual(["b"]);
  });

  it("`dari` memakai awal hari WIB, inklusif", () => {
    const posts = [
      post({ id: "4 Nov 23.59 WIB", postedAt: new Date("2026-11-04T16:59:59Z") }),
      post({ id: "5 Nov 00.00 WIB", postedAt: new Date("2026-11-04T17:00:00Z") }),
    ];
    expect(filterPosts(posts, filters({ from: "2026-11-05" })).map((p) => p.id)).toEqual([
      "5 Nov 00.00 WIB",
    ]);
  });

  it("`sampai` memakai akhir hari WIB, inklusif", () => {
    const posts = [
      post({ id: "5 Nov 23.59 WIB", postedAt: new Date("2026-11-05T16:59:59.999Z") }),
      post({ id: "6 Nov 00.00 WIB", postedAt: new Date("2026-11-05T17:00:00Z") }),
    ];
    expect(filterPosts(posts, filters({ to: "2026-11-05" })).map((p) => p.id)).toEqual([
      "5 Nov 23.59 WIB",
    ]);
  });

  it("semua filter digabung", () => {
    const match = post({ id: "cocok", platform: "INSTAGRAM", status: "NEED_H1" });
    const posts = [match, post({ id: "platform lain", status: "NEED_H1" })];
    const result = filterPosts(
      posts,
      filters({
        platform: "INSTAGRAM",
        pillarId: "proses",
        status: "PERLU",
        from: "2026-11-05",
        to: "2026-11-05",
      }),
    );
    expect(result).toEqual([match]);
  });
});

describe("pillarOptions", () => {
  it("data kosong", () => {
    expect(pillarOptions([])).toEqual([]);
  });

  it("unik per id, urut nama", () => {
    const tips = { id: "tips", name: "Tips" };
    const proses = { id: "proses", name: "Proses" };
    const options = pillarOptions([{ pillar: tips }, { pillar: proses }, { pillar: tips }]);
    expect(options).toEqual([proses, tips]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: POSTS_PER_PAGE * 2 + 5 }, (_, i) => i);

  it("data kosong: satu halaman tanpa isi", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1 });
    expect(paginate([], 9)).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  it("20 per halaman", () => {
    const first = paginate(items, 1);
    expect(first.items).toHaveLength(20);
    expect(first.items[0]).toBe(0);
    expect(first.pageCount).toBe(3);
    expect(paginate(items, 3).items).toEqual([40, 41, 42, 43, 44]);
  });

  it("tepat 20 item: satu halaman", () => {
    expect(paginate(items.slice(0, 20), 1).pageCount).toBe(1);
  });

  it("halaman di luar batas tidak error", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 99).items).toHaveLength(5);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, -4).page).toBe(1);
  });
});
