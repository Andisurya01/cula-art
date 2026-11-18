// Integrasi ke database test: data halaman Review Mingguan (review tersimpan, riwayat, rencana).

import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, startOfWibWeek, toWibDateString, wibToUtc } from "@/lib/date";
import { getPlanData, getReviewHistory, getReviewPageData, getWeeklyReview } from "./queries";
import { freezeSummary, parseFrozenSummary, toSummaryData } from "./summary";
import { weeklySummary } from "@/lib/analytics/review";

const NOW = new Date();
const THIS_WEEK = startOfWibWeek(NOW);
const LAST_WEEK = addWibDays(THIS_WEEK, -7);
const NEXT_WEEK = addWibDays(THIS_WEEK, 7);
const at = (week: Date, day: number, time = "19:00") => wibToUtc(toWibDateString(addWibDays(week, day)), time);

let pillarId = "";

function frozenJson(weekStart: Date, postedCount: number, target = 3) {
  const data = toSummaryData(weeklySummary({ weekStart, target, posts: [], followers: [] }), []);
  return freezeSummary({ ...data, postedCount, targetMet: postedCount >= target }, NOW);
}

beforeEach(async () => {
  await resetDatabase();
  pillarId = (await db.pillar.create({ data: { name: "Proses Clay", color: "#f97316" } })).id;
});

describe("getWeeklyReview / getReviewHistory", () => {
  it("riwayat terbaru dulu; ringkasan rusak dianggap tidak ada", async () => {
    const twoWeeks = addWibDays(THIS_WEEK, -14);
    await db.weeklyReview.create({
      data: { weekStart: twoWeeks, focusNext: "- Seri naga\n- Hook", summaryJson: frozenJson(twoWeeks, 3) },
    });
    await db.weeklyReview.create({ data: { weekStart: LAST_WEEK, wins: "Berhasil", summaryJson: "{rusak" } });

    const history = await getReviewHistory();
    expect(history.map((h) => h.key)).toEqual([toWibDateString(LAST_WEEK), toWibDateString(twoWeeks)]);
    expect(history[0]).toMatchObject({ postedCount: null, target: null, targetMet: null, focusNext: null });
    expect(history[1]).toMatchObject({ postedCount: 3, target: 3, targetMet: true, focusNext: "- Seri naga\n- Hook" });

    const saved = await getWeeklyReview(LAST_WEEK);
    expect(saved).toMatchObject({ wins: "Berhasil", repeat: "", stop: "", focusNext: "", frozen: null });
    expect(await getWeeklyReview(THIS_WEEK)).toBeNull();
  });
});

describe("getPlanData", () => {
  it("kandidat Siap Posting dulu, yang terjadwal di masa depan bukan kandidat, slot minggu rencana", async () => {
    const planning = await db.content.create({ data: { title: "Perencanaan", stage: "PLANNING", pillarId } });
    const ready = await db.content.create({ data: { title: "Siap", stage: "READY", pillarId } });
    const editing = await db.content.create({ data: { title: "Editing", stage: "EDITING", pillarId } });
    // Dijadwalkan ke Selasa 19.00 minggu rencana → slot itu terisi, konten tetap ada di opsi (bukan kandidat).
    const scheduled = await db.content.create({
      data: {
        title: "Terjadwal",
        stage: "READY",
        pillarId,
        posts: { create: { platform: "TIKTOK", postType: "VIDEO", scheduledAt: at(NEXT_WEEK, 1) } },
      },
    });
    const postedOld = await db.content.create({
      data: {
        title: "Sudah tayang",
        stage: "POSTED",
        pillarId,
        posts: { create: { platform: "TIKTOK", postType: "VIDEO", postedAt: at(LAST_WEEK, 2) } },
      },
    });

    // Review minggu berjalan → rencana minggu depan (semua slotnya di masa depan).
    const plan = await getPlanData(THIS_WEEK, [postedOld.id, "konten-hilang", ready.id], NOW);
    expect(plan.weekStart).toEqual(NEXT_WEEK);
    expect(plan.editable).toBe(true);
    expect(plan.options.filter((o) => o.candidate).map((o) => o.id)).toEqual([ready.id, editing.id, planning.id]);
    expect(plan.options.find((o) => o.id === scheduled.id)).toMatchObject({ candidate: false });
    // Konten tayang hanya muncul karena ada di rencana tersimpan.
    expect(plan.options.find((o) => o.id === postedOld.id)).toMatchObject({ candidate: false });
    expect(plan.savedIds).toEqual([postedOld.id, ready.id]);
    // Slot default Sel/Kam/Sab 19.00; Selasa terisi.
    expect(plan.slots.map((s) => s.key)).toEqual([
      `${toWibDateString(addWibDays(NEXT_WEEK, 3))}T19:00`,
      `${toWibDateString(addWibDays(NEXT_WEEK, 5))}T19:00`,
    ]);

    const empty = await getPlanData(THIS_WEEK, [], NOW);
    expect(empty.options.some((o) => o.id === postedOld.id)).toBe(false);
  });

  it("minggu rencana yang sudah lewat tidak bisa diubah dan tidak punya slot", async () => {
    const plan = await getPlanData(addWibDays(THIS_WEEK, -21), [], NOW);
    expect(plan.editable).toBe(false);
    expect(plan.slots).toEqual([]);
  });
});

describe("getReviewPageData", () => {
  it("database kosong: ringkasan nol, tanpa review, riwayat kosong", async () => {
    const data = await getReviewPageData(LAST_WEEK, NOW);
    expect(data.saved).toBeNull();
    expect(data.history).toEqual([]);
    expect(data.live.data).toMatchObject({ weekStart: toWibDateString(LAST_WEEK), target: 3, postedCount: 0, targetMet: false });
    expect(data.live.data.platforms.map((p) => [p.platform, p.postCount, p.followersGained])).toEqual([
      ["TIKTOK", 0, null],
      ["INSTAGRAM", 0, null],
    ]);
    expect(data.live.data.suggestions).toEqual(data.live.suggestions.map((s) => `${s.title}: ${s.message}`));
    expect(data.latestFollowers.map((f) => f.followers)).toEqual([null, null]);
    expect(data.plan.weekStart).toEqual(THIS_WEEK);
  });

  it("review tersimpan membawa ringkasan beku dan rencana tanpa konten yang dihapus", async () => {
    const content = await db.content.create({ data: { title: "Rencana", stage: "READY", pillarId } });
    await db.weeklyReview.create({
      data: {
        weekStart: LAST_WEEK,
        focusNext: "Fokus",
        summaryJson: frozenJson(LAST_WEEK, 2),
        plannedContentIds: ["dihapus", content.id],
      },
    });
    const data = await getReviewPageData(LAST_WEEK, NOW);
    expect(data.saved?.frozen?.postedCount).toBe(2);
    expect(data.saved?.plannedContentIds).toEqual(["dihapus", content.id]);
    expect(data.plan.savedIds).toEqual([content.id]);
    expect(parseFrozenSummary(frozenJson(LAST_WEEK, 2))?.frozenAt).toBe(NOW.toISOString());
  });
});
