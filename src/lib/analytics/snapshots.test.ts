import { describe, expect, it } from "vitest";
import {
  isMetricDue,
  metricStatus,
  nextMetricKind,
  pendingMetrics,
  pickBestSnapshot,
} from "./snapshots";

const HOUR = 3_600_000;
const NOW = new Date("2026-11-05T12:00:00.000Z");
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR);

describe("pickBestSnapshot", () => {
  it("data kosong → null", () => {
    expect(pickBestSnapshot([])).toBeNull();
  });

  it("H+7 didahulukan, urutan input tidak berpengaruh", () => {
    expect(pickBestSnapshot([{ kind: "H1" }, { kind: "H7" }])?.kind).toBe("H7");
    expect(pickBestSnapshot([{ kind: "H7" }, { kind: "H1" }])?.kind).toBe("H7");
  });

  it("cadangan H+1 jika H+7 belum ada", () => {
    expect(pickBestSnapshot([{ kind: "H1", views: 10 }])).toEqual({ kind: "H1", views: 10 });
  });

  it("CUSTOM tidak pernah dipakai", () => {
    expect(pickBestSnapshot([{ kind: "CUSTOM" }])).toBeNull();
    expect(pickBestSnapshot([{ kind: "CUSTOM" }, { kind: "H1" }])?.kind).toBe("H1");
  });
});

describe("metricStatus (D3)", () => {
  it.each([
    ["baru tayang", 0, [], "WAITING_H1"],
    ["hampir 24 jam", 23.99, [], "WAITING_H1"],
    ["tepat 24 jam tanpa H+1", 24, [], "NEED_H1"],
    ["6 hari tanpa H+1", 6 * 24, [], "NEED_H1"],
    ["ada H+1, belum 7 hari", 3 * 24, ["H1"], "WAITING_H7"],
    ["H+1 diisi sebelum 24 jam", 2, ["H1"], "WAITING_H7"],
    ["tepat 7 hari ada H+1", 7 * 24, ["H1"], "NEED_H7"],
    ["tepat 7 hari tanpa H+1: H+1 tidak ditagih lagi", 7 * 24, [], "NEED_H7"],
    ["30 hari tanpa snapshot", 30 * 24, [], "NEED_H7"],
    ["ada H+7", 8 * 24, ["H7"], "COMPLETE"],
    ["ada H+1 dan H+7", 8 * 24, ["H1", "H7"], "COMPLETE"],
    ["H+7 diisi lebih awal", 2 * 24, ["H7"], "COMPLETE"],
    ["CUSTOM tidak mengubah status", 30, ["CUSTOM"], "NEED_H1"],
    ["waktu posting di masa depan", -5, [], "WAITING_H1"],
  ] as const)("%s", (_name, hours, kinds, expected) => {
    const snapshots = kinds.map((kind) => ({ kind }));
    expect(metricStatus(ago(hours), snapshots, NOW)).toBe(expected);
  });
});

describe("isMetricDue dan nextMetricKind", () => {
  it("hanya status Perlu yang tertunda", () => {
    expect(isMetricDue("NEED_H1")).toBe(true);
    expect(isMetricDue("NEED_H7")).toBe(true);
    expect(isMetricDue("WAITING_H1")).toBe(false);
    expect(isMetricDue("WAITING_H7")).toBe(false);
    expect(isMetricDue("COMPLETE")).toBe(false);
  });

  it("jenis form mengikuti status", () => {
    expect(nextMetricKind("WAITING_H1")).toBe("H1");
    expect(nextMetricKind("NEED_H1")).toBe("H1");
    expect(nextMetricKind("WAITING_H7")).toBe("H7");
    expect(nextMetricKind("NEED_H7")).toBe("H7");
    expect(nextMetricKind("COMPLETE")).toBe("H7");
  });
});

describe("pendingMetrics", () => {
  it("data kosong → kosong", () => {
    expect(pendingMetrics([], NOW)).toEqual([]);
  });

  it("hanya yang tertunda, H+1 lebih dulu, lalu paling lama, dengan jenis form yang benar", () => {
    const posts = [
      { id: "baru", postedAt: ago(2), snapshots: [] },
      { id: "h1-baru", postedAt: ago(30), snapshots: [] },
      { id: "h1-lama", postedAt: ago(100), snapshots: [] },
      { id: "h7-baru", postedAt: ago(200), snapshots: [{ kind: "H1" as const }] },
      { id: "h7-lama", postedAt: ago(900), snapshots: [] },
      { id: "lengkap", postedAt: ago(300), snapshots: [{ kind: "H7" as const }] },
    ];
    const result = pendingMetrics(posts, NOW);
    expect(result.map((r) => [r.post.id, r.kind])).toEqual([
      ["h1-lama", "H1"],
      ["h1-baru", "H1"],
      ["h7-lama", "H7"],
      ["h7-baru", "H7"],
    ]);
  });
});
