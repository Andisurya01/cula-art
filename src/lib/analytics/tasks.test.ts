import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { followerSnapshotReminders, taskWindow, todayTasks, type TaskPost } from "./tasks";

const NOW = wibToUtc("2026-11-05", "12:00");

function post(partial: Partial<TaskPost> & { scheduledAt: Date | null }): TaskPost {
  return {
    contentId: "c1",
    title: "Konten",
    platform: "TIKTOK",
    postedAt: null,
    stage: "READY",
    ...partial,
  };
}

describe("taskWindow", () => {
  it("dari 7 hari lalu sampai akhir 2 hari lagi, batas hari WIB", () => {
    expect(taskWindow(NOW)).toEqual({ from: wibToUtc("2026-10-29"), to: wibToUtc("2026-11-08") });
  });
});

describe("todayTasks (D7)", () => {
  it("data kosong → kosong", () => {
    expect(todayTasks([], NOW)).toEqual([]);
  });

  it("post nanti hari ini = TODAY", () => {
    const [task] = todayTasks([post({ scheduledAt: wibToUtc("2026-11-05", "19:00") })], NOW);
    expect(task).toMatchObject({ kind: "TODAY", notReady: false, platforms: ["TIKTOK"] });
  });

  it("jadwal hari ini yang sudah lewat dan jadwal kemarin = OVERDUE", () => {
    const tasks = todayTasks(
      [
        post({ contentId: "a", scheduledAt: wibToUtc("2026-11-05", "08:00") }),
        post({ contentId: "b", scheduledAt: wibToUtc("2026-11-04", "19:00") }),
      ],
      NOW,
    );
    expect(tasks.map((t) => [t.contentId, t.kind])).toEqual([
      ["b", "OVERDUE"],
      ["a", "OVERDUE"],
    ]);
  });

  it("lewat jadwal maksimal 7 hari ke belakang, batas hari WIB", () => {
    const tasks = todayTasks(
      [
        post({ contentId: "masuk", scheduledAt: wibToUtc("2026-10-29", "00:00") }),
        post({ contentId: "lewat", scheduledAt: wibToUtc("2026-10-28", "23:59") }),
      ],
      NOW,
    );
    expect(tasks.map((t) => t.contentId)).toEqual(["masuk"]);
  });

  it("post yang sudah tayang tidak jadi tugas", () => {
    const tasks = todayTasks(
      [post({ scheduledAt: wibToUtc("2026-11-05", "08:00"), postedAt: wibToUtc("2026-11-05", "08:05") })],
      NOW,
    );
    expect(tasks).toEqual([]);
  });

  it("konten terjadwal ≤ 2 hari lagi yang belum Siap Posting = NOT_READY", () => {
    const tasks = todayTasks(
      [
        post({ contentId: "besok", stage: "EDITING", scheduledAt: wibToUtc("2026-11-06", "19:00") }),
        post({ contentId: "lusa", stage: "PLANNING", scheduledAt: wibToUtc("2026-11-07", "23:59") }),
        post({ contentId: "jauh", stage: "EDITING", scheduledAt: wibToUtc("2026-11-08", "00:00") }),
        post({ contentId: "siap", stage: "READY", scheduledAt: wibToUtc("2026-11-06", "19:00") }),
        post({ contentId: "tayang", stage: "POSTED", scheduledAt: wibToUtc("2026-11-06", "19:00") }),
      ],
      NOW,
    );
    expect(tasks.map((t) => [t.contentId, t.kind])).toEqual([
      ["besok", "NOT_READY"],
      ["lusa", "NOT_READY"],
    ]);
  });

  it("post hari ini yang kontennya belum siap membawa penanda notReady, tanpa baris ganda", () => {
    const tasks = todayTasks([post({ stage: "EDITING", scheduledAt: wibToUtc("2026-11-05", "19:00") })], NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ kind: "TODAY", notReady: true, stage: "EDITING" });
  });

  it("dua platform di jenis yang sama = satu baris; jadwal paling awal dipakai", () => {
    const tasks = todayTasks(
      [
        post({ platform: "INSTAGRAM", scheduledAt: wibToUtc("2026-11-05", "20:00") }),
        post({ platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-05", "19:00") }),
      ],
      NOW,
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].platforms).toEqual(["INSTAGRAM", "TIKTOK"]);
    expect(tasks[0].at).toEqual(wibToUtc("2026-11-05", "19:00"));
  });

  it("dua platform beda jenis = dua baris, lewat jadwal lebih dulu", () => {
    const tasks = todayTasks(
      [
        post({ platform: "INSTAGRAM", scheduledAt: wibToUtc("2026-11-05", "20:00") }),
        post({ platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-05", "09:00") }),
      ],
      NOW,
    );
    expect(tasks.map((t) => t.kind)).toEqual(["OVERDUE", "TODAY"]);
  });

  it("batas hari mengikuti WIB dekat tengah malam", () => {
    // 23.30 WIB: jadwal 00.10 WIB besok sudah bukan "hari ini".
    const late = wibToUtc("2026-11-05", "23:30");
    const tasks = todayTasks(
      [
        post({ contentId: "besok", stage: "EDITING", scheduledAt: wibToUtc("2026-11-06", "00:10") }),
        post({ contentId: "malam", scheduledAt: wibToUtc("2026-11-05", "23:50") }),
      ],
      late,
    );
    expect(tasks.map((t) => [t.contentId, t.kind])).toEqual([
      ["malam", "TODAY"],
      ["besok", "NOT_READY"],
    ]);
  });
});

describe("followerSnapshotReminders (D8)", () => {
  it("data kosong → kosong", () => {
    expect(followerSnapshotReminders([], NOW)).toEqual([]);
  });

  it("belum pernah isi → diingatkan", () => {
    expect(followerSnapshotReminders([{ platform: "TIKTOK", date: null }], NOW)).toEqual(["TIKTOK"]);
  });

  it("6 hari lalu masih aman; 7 hari lalu diingatkan", () => {
    expect(
      followerSnapshotReminders(
        [
          { platform: "TIKTOK", date: wibToUtc("2026-10-30") },
          { platform: "INSTAGRAM", date: wibToUtc("2026-10-29") },
        ],
        NOW,
      ),
    ).toEqual(["INSTAGRAM"]);
  });

  it("dihitung per hari kalender WIB", () => {
    const earlyMorning = wibToUtc("2026-11-06", "00:05");
    expect(
      followerSnapshotReminders([{ platform: "TIKTOK", date: wibToUtc("2026-10-30") }], earlyMorning),
    ).toEqual(["TIKTOK"]);
  });
});
