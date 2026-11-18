import { describe, expect, it } from "vitest";
import type { FollowerPoint } from "@/lib/analytics/kpi";
import { wibToUtc } from "@/lib/date";
import {
  followerCards,
  followerDomain,
  groupWeekItems,
  HOME_SUGGESTION_LIMIT,
  orderedPlatforms,
  platformList,
  reviewReminderView,
  SUGGESTIONS_EMPTY_NOTE,
  TASK_KIND_LABELS,
  taskStageNote,
  taskTimeLabel,
  weekProgress,
  weekProgressNote,
  weekRangeLabel,
  type WeekPost,
} from "./derive";

const pillar = { name: "Proses Clay", color: "#f97316" };

function weekPost(contentId: string, overrides: Partial<WeekPost> = {}): WeekPost {
  return {
    platform: "TIKTOK",
    scheduledAt: null,
    postedAt: null,
    content: { id: contentId, title: `Konten ${contentId}`, pillar },
    ...overrides,
  };
}

describe("groupWeekItems", () => {
  it("data kosong", () => {
    expect(groupWeekItems([])).toEqual([]);
  });

  it("satu konten di dua platform = satu baris, memakai waktu paling awal", () => {
    const items = groupWeekItems([
      weekPost("a", { platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-06", "19:00") }),
      weekPost("a", { platform: "INSTAGRAM", postedAt: wibToUtc("2026-11-04", "08:00") }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      contentId: "a",
      posted: true,
      platforms: ["TIKTOK", "INSTAGRAM"],
      at: wibToUtc("2026-11-04", "08:00"),
    });
  });

  it("post tanpa waktu dilewati, hasil urut waktu", () => {
    const items = groupWeekItems([
      weekPost("tanpa-waktu"),
      weekPost("nanti", { scheduledAt: wibToUtc("2026-11-07") }),
      weekPost("dulu", { postedAt: wibToUtc("2026-11-03") }),
    ]);
    expect(items.map((item) => item.contentId)).toEqual(["dulu", "nanti"]);
  });
});

describe("weekProgress", () => {
  const items = (posted: number, scheduled: number) => [
    ...Array.from({ length: posted }, () => ({ posted: true })),
    ...Array.from({ length: scheduled }, () => ({ posted: false })),
  ];

  it("data kosong", () => {
    expect(weekProgress([], 3)).toEqual({ posted: 0, scheduled: 0, remaining: 3, postedRatio: 0, scheduledRatio: 0 });
  });

  it("tayang dan terjadwal dipisah terhadap target", () => {
    expect(weekProgress(items(1, 1), 4)).toEqual({
      posted: 1,
      scheduled: 1,
      remaining: 2,
      postedRatio: 0.25,
      scheduledRatio: 0.25,
    });
  });

  it("melebihi target: bilah tidak pernah lebih dari penuh", () => {
    const over = weekProgress(items(2, 5), 3);
    expect(over.remaining).toBe(0);
    expect(over.postedRatio + over.scheduledRatio).toBeCloseTo(1);

    const allPosted = weekProgress(items(5, 1), 3);
    expect(allPosted.postedRatio).toBe(1);
    expect(allPosted.scheduledRatio).toBe(0);
  });

  it("target 0 tidak menghasilkan NaN", () => {
    expect(weekProgress(items(1, 1), 0)).toMatchObject({ remaining: 0, postedRatio: 0, scheduledRatio: 0 });
  });
});

describe("weekProgressNote", () => {
  it("kurang, terjadwal cukup, dan tercapai", () => {
    expect(weekProgressNote({ posted: 1, remaining: 2 }, 3)).toBe("kurang 2 slot terjadwal");
    expect(weekProgressNote({ posted: 1, remaining: 0 }, 3)).toBe("target terjadwal terpenuhi");
    expect(weekProgressNote({ posted: 3, remaining: 0 }, 3)).toBe("target minggu ini tercapai");
  });
});

describe("label tugas", () => {
  it("setiap jenis punya penanda", () => {
    expect(TASK_KIND_LABELS).toEqual({ OVERDUE: "Lewat jadwal", TODAY: "Hari ini", NOT_READY: "Belum siap" });
  });

  it("stage hanya disebut untuk OVERDUE dan TODAY yang belum siap", () => {
    expect(taskStageNote({ kind: "TODAY", notReady: true, stage: "EDITING" })).toBe("Masih Editing");
    expect(taskStageNote({ kind: "OVERDUE", notReady: true, stage: "PLANNING" })).toBe("Masih Perencanaan");
    expect(taskStageNote({ kind: "TODAY", notReady: false, stage: "READY" })).toBeNull();
    expect(taskStageNote({ kind: "OVERDUE", notReady: false, stage: "POSTED" })).toBeNull();
    expect(taskStageNote({ kind: "NOT_READY", notReady: true, stage: "PRODUCTION" })).toBeNull();
  });

  it("jam saja untuk hari ini WIB, hari lain menyertakan tanggal", () => {
    const now = wibToUtc("2026-11-05", "23:30");
    expect(taskTimeLabel(wibToUtc("2026-11-05", "00:10"), now)).toBe("00.10");
    // 17.00 UTC tanggal 5 = 00.00 WIB tanggal 6, jadi bukan hari ini lagi.
    expect(taskTimeLabel(new Date("2026-11-05T17:00:00Z"), now)).toBe("Jum, 6 Nov 00.00");
    expect(taskTimeLabel(wibToUtc("2026-10-29", "19:00"), now)).toBe("Kam, 29 Okt 19.00");
  });
});

describe("daftar platform", () => {
  it("urutan tetap, data kosong menjadi teks kosong", () => {
    expect(orderedPlatforms(["INSTAGRAM", "TIKTOK"])).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(orderedPlatforms([])).toEqual([]);
    expect(platformList(["INSTAGRAM", "TIKTOK"])).toBe("TikTok dan Instagram");
    expect(platformList(["INSTAGRAM"])).toBe("Instagram");
    expect(platformList([])).toBe("");
  });
});

describe("followerCards", () => {
  const point = (platform: FollowerPoint["platform"], date: string, followers: number): FollowerPoint => ({
    platform,
    date: wibToUtc(date),
    followers,
  });

  it("data kosong: tetap satu kartu per platform, tanpa angka", () => {
    expect(followerCards([])).toEqual([
      { platform: "TIKTOK", points: [], latest: null, gained: null },
      { platform: "INSTAGRAM", points: [], latest: null, gained: null },
    ]);
  });

  it("platform tidak pernah tercampur dan titik urut tanggal", () => {
    const [tiktok, instagram] = followerCards([
      point("TIKTOK", "2026-11-03", 1200),
      point("INSTAGRAM", "2026-11-01", 500),
      point("TIKTOK", "2026-10-20", 1000),
    ]);
    expect(tiktok).toEqual({
      platform: "TIKTOK",
      points: [
        { t: wibToUtc("2026-10-20").getTime(), value: 1000 },
        { t: wibToUtc("2026-11-03").getTime(), value: 1200 },
      ],
      latest: 1200,
      gained: 200,
    });
    // Satu snapshot: angka terakhir ada, selisih belum bisa dihitung (D10).
    expect(instagram).toEqual({
      platform: "INSTAGRAM",
      points: [{ t: wibToUtc("2026-11-01").getTime(), value: 500 }],
      latest: 500,
      gained: null,
    });
  });
});

describe("followerDomain", () => {
  it("30 hari termasuk hari ini, dalam tanggal WIB", () => {
    // 20.00 UTC tanggal 5 = 03.00 WIB tanggal 6.
    expect(followerDomain(new Date("2026-11-05T20:00:00Z"))).toEqual([
      wibToUtc("2026-10-08").getTime(),
      wibToUtc("2026-11-06").getTime(),
    ]);
  });
});

describe("kartu saran", () => {
  it("3 teratas, dan empty state menjelaskan kapan saran muncul", () => {
    expect(HOME_SUGGESTION_LIMIT).toBe(3);
    expect(SUGGESTIONS_EMPTY_NOTE).toContain("(mulai Kamis)");
    expect(SUGGESTIONS_EMPTY_NOTE).toContain("konten macet lebih dari 7 hari");
    expect(SUGGESTIONS_EMPTY_NOTE).toContain("ide Baru kurang dari 5");
    expect(SUGGESTIONS_EMPTY_NOTE).toContain("minimal 3 post berskor relatif dalam satu grup di platform yang sama");
    expect(SUGGESTIONS_EMPTY_NOTE).toContain("muncul lagi setelah 7 hari");
  });
});

describe("weekRangeLabel", () => {
  it("Senin-Minggu WIB: bulan sama, beda bulan, beda tahun", () => {
    expect(weekRangeLabel(wibToUtc("2026-11-02"))).toBe("2-8 Nov 2026");
    expect(weekRangeLabel(wibToUtc("2026-10-26"))).toBe("26 Okt-1 Nov 2026");
    expect(weekRangeLabel(wibToUtc("2025-12-29"))).toBe("29 Des 2025-4 Jan 2026");
  });
});

describe("reviewReminderView (E8)", () => {
  it("minggu ini (Minggu malam): tautan ke Review minggu berjalan", () => {
    expect(reviewReminderView({ kind: "THIS_WEEK", weekStart: wibToUtc("2026-11-02") })).toEqual({
      title: "Saatnya review mingguan",
      description: expect.stringContaining("Minggu 2-8 Nov 2026 hampir selesai."),
      actionLabel: "Isi review minggu ini",
      href: "/studio/review?minggu=2026-11-02",
    });
  });

  it("minggu lalu (Senin-Selasa): belum diisi, tautan ke minggu lalu", () => {
    expect(reviewReminderView({ kind: "LAST_WEEK", weekStart: wibToUtc("2026-10-26") })).toEqual({
      title: "Review minggu lalu belum diisi",
      description: expect.stringContaining("Minggu 26 Okt-1 Nov 2026 belum di-review."),
      actionLabel: "Isi review minggu lalu",
      href: "/studio/review?minggu=2026-10-26",
    });
  });
});
