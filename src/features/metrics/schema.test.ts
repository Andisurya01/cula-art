import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wibToUtc } from "@/lib/date";
import {
  accountSnapshotsSchema,
  metricValuesSchema,
  metricWarnings,
  saveMetricSnapshotSchema,
} from "./schema";

const VALID = {
  views: "12,3K",
  likes: "1.234",
  comments: "56",
  shares: "7",
  saves: "8",
  follows: "9",
  avgWatchSec: "8,3",
  completionRate: "45,5%",
};

describe("metricValuesSchema", () => {
  it("mengubah format aplikasi menjadi angka", () => {
    expect(metricValuesSchema.parse(VALID)).toEqual({
      views: 12300,
      likes: 1234,
      comments: 56,
      shares: 7,
      saves: 8,
      follows: 9,
      avgWatchSec: 8.3,
      completionRate: 45.5,
    });
  });

  it("idempoten: hasil parse bisa di-parse ulang (client → Server Action)", () => {
    const once = metricValuesSchema.parse(VALID);
    expect(metricValuesSchema.parse(once)).toEqual(once);
  });

  it("views wajib; field inti lain kosong = 0; opsional kosong = null", () => {
    expect(metricValuesSchema.parse({ ...VALID, likes: "", comments: " ", avgWatchSec: "", completionRate: "" })).toMatchObject({
      likes: 0,
      comments: 0,
      avgWatchSec: null,
      completionRate: null,
    });
    const missing = metricValuesSchema.safeParse({ ...VALID, views: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]).toMatchObject({ path: ["views"], message: "Wajib diisi" });
  });

  it("angka mentah harus bilangan bulat; 12.345 tidak dibaca sebagai 12345", () => {
    expect(metricValuesSchema.parse({ ...VALID, views: 12345 }).views).toBe(12345);
    for (const views of [12.345, -1, Number.NaN, 3_000_000_000]) {
      const result = metricValuesSchema.safeParse({ ...VALID, views });
      expect(result.success).toBe(false);
    }
    expect(metricValuesSchema.safeParse({ ...VALID, likes: 1.5 }).success).toBe(false);
    expect(accountSnapshotsSchema.safeParse({ date: "2026-01-05", TIKTOK: 12.345, INSTAGRAM: null }).success).toBe(false);
  });

  it("views 0 diterima", () => {
    expect(metricValuesSchema.parse({ ...VALID, views: "0" }).views).toBe(0);
  });

  it.each([
    ["negatif", { likes: "-1" }, "likes"],
    ["desimal", { likes: "1,5" }, "likes"],
    ["huruf", { views: "abc" }, "views"],
    ["completion di atas 100", { completionRate: "100,5" }, "completionRate"],
    ["completion negatif", { completionRate: "-1" }, "completionRate"],
    ["waktu tonton tidak valid", { avgWatchSec: "abc" }, "avgWatchSec"],
    ["waktu tonton negatif", { avgWatchSec: "-3" }, "avgWatchSec"],
    ["waktu tonton terlalu besar", { avgWatchSec: "3601" }, "avgWatchSec"],
    ["angka negatif langsung", { avgWatchSec: -3 }, "avgWatchSec"],
  ])("menolak %s", (_name, patch, field) => {
    const result = metricValuesSchema.safeParse({ ...VALID, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("completion rate 0 dan 100 diterima", () => {
    expect(metricValuesSchema.parse({ ...VALID, completionRate: "0" }).completionRate).toBe(0);
    expect(metricValuesSchema.parse({ ...VALID, completionRate: "100" }).completionRate).toBe(100);
  });
});

describe("saveMetricSnapshotSchema", () => {
  it("hanya menerima H1 dan H7 (CUSTOM belum punya UI)", () => {
    expect(saveMetricSnapshotSchema.safeParse({ ...VALID, postId: "p", kind: "H7" }).success).toBe(true);
    expect(saveMetricSnapshotSchema.safeParse({ ...VALID, postId: "p", kind: "CUSTOM" }).success).toBe(false);
    expect(saveMetricSnapshotSchema.safeParse({ ...VALID, postId: "", kind: "H1" }).success).toBe(false);
  });
});

describe("metricWarnings", () => {
  it("likes > views hanya peringatan, memakai label platform", () => {
    expect(metricWarnings({ views: 10, likes: 20 }, "Reach")[0]).toMatch(/Likes lebih besar dari Reach/);
    expect(metricWarnings({ views: 10, likes: 10 }, "Views")).toEqual([]);
    expect(metricWarnings({ views: null, likes: 10 }, "Views")).toEqual([]);
    expect(metricWarnings({ views: 0, likes: 0 }, "Views")).toEqual([]);
  });
});

describe("accountSnapshotsSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(wibToUtc("2026-11-05", "00:30")); // 17.30 UTC tanggal 4
  });
  afterEach(() => vi.useRealTimers());

  it("memakai tanggal WIB untuk batas masa depan", () => {
    expect(accountSnapshotsSchema.safeParse({ date: "2026-11-05", TIKTOK: "100", INSTAGRAM: "" }).success).toBe(true);
    const future = accountSnapshotsSchema.safeParse({ date: "2026-11-06", TIKTOK: "100", INSTAGRAM: "" });
    expect(future.success).toBe(false);
    expect(future.error?.issues[0].message).toMatch(/masa depan/);
  });

  it("tanggal tidak valid ditolak", () => {
    expect(accountSnapshotsSchema.safeParse({ date: "2026-02-31", TIKTOK: "1", INSTAGRAM: "" }).success).toBe(false);
    expect(accountSnapshotsSchema.safeParse({ date: "", TIKTOK: "1", INSTAGRAM: "" }).success).toBe(false);
  });

  it("minimal satu platform; 0 followers diterima", () => {
    expect(accountSnapshotsSchema.safeParse({ date: "2026-11-05", TIKTOK: "", INSTAGRAM: "" }).success).toBe(false);
    expect(accountSnapshotsSchema.parse({ date: "2026-11-05", TIKTOK: "0", INSTAGRAM: "1,2rb" })).toEqual({
      date: "2026-11-05",
      TIKTOK: 0,
      INSTAGRAM: 1200,
    });
  });

  it("idempoten", () => {
    const once = accountSnapshotsSchema.parse({ date: "2026-11-05", TIKTOK: "1,2rb", INSTAGRAM: "" });
    expect(accountSnapshotsSchema.parse(once)).toEqual(once);
  });
});
