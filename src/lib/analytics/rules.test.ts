import { describe, expect, it } from "vitest";
import { addWibDays, wibToUtc } from "@/lib/date";
import { IDEA_BANK_LOW_THRESHOLD } from "@/lib/labels";
import type { AnalyticsPlatform } from "./metrics";
import {
  computeSuggestions,
  dismissUntil,
  LOW_IDEAS_THRESHOLD,
  RULE_IDS,
  RULE_PRIORITY,
  SUGGESTION_KEY_PATTERN,
  suggestionKey,
  type RuleContent,
  type RuleInput,
  type RulePost,
  type Suggestion,
} from "./rules";

// Kamis 12 Nov 2026 20.00 WIB; minggu WIB dimulai Senin 9 Nov.
const NOW = wibToUtc("2026-11-12", "20:00");
const daysAgo = (n: number, time = "19:00") => wibToUtc(addDaysStr(-n), time);

function addDaysStr(n: number): string {
  const d = addWibDays(wibToUtc("2026-11-12", "12:00"), n);
  return d.toISOString().slice(0, 10);
}

const clay = { id: "pil-clay", name: "Proses Clay" };
const gambar = { id: "pil-gambar", name: "Progres Gambar" };
const tips = { id: "pil-tips", name: "Tips dan Tutorial" };
const timelapse = { id: "fmt-time", name: "Time-lapse" };
const hookHasil = { id: "hook-hasil", name: "Hasil di depan" };
const hookTanya = { id: "hook-tanya", name: "Pertanyaan" };

let seq = 0;
function post(partial: Partial<RulePost> = {}): RulePost {
  seq += 1;
  return {
    id: `post-${seq}`,
    contentId: `content-${seq}`,
    title: `Konten ${seq}`,
    platform: "TIKTOK",
    postedAt: daysAgo(60),
    status: "COMPLETE",
    relativeScore: 1,
    pillar: clay,
    format: timelapse,
    hookType: hookHasil,
    ...partial,
  };
}

function content(partial: Partial<RuleContent> & { id: string }): RuleContent {
  return {
    title: partial.id,
    stage: "PLANNING",
    stageChangedAt: daysAgo(1),
    projectId: null,
    seriesPart: null,
    ...partial,
  };
}

function input(partial: Partial<RuleInput> = {}): RuleInput {
  return {
    now: NOW,
    weeklyPostTarget: 0,
    posts: [],
    scheduled: [],
    contents: [],
    projects: [],
    pillars: [],
    newIdeaCount: 10,
    dismissed: new Set(),
    ...partial,
  };
}

const rulesOf = (list: Suggestion[]) => list.map((s) => s.rule);
type Of<R extends Suggestion["rule"]> = Extract<Suggestion, { rule: R }> extends never
  ? Suggestion & Extract<Suggestion, { rule: "best-pillar" | "best-hook" | "best-time" }>
  : Extract<Suggestion, { rule: R }>;
const only = <R extends Suggestion["rule"]>(list: Suggestion[], rule: R) =>
  list.filter((s): s is Of<R> => s.rule === rule);

describe("computeSuggestions: umum", () => {
  it("data kosong (Senin, tanpa target, ide cukup) → tidak ada saran", () => {
    expect(computeSuggestions(input({ now: wibToUtc("2026-11-09", "10:00") }))).toEqual([]);
  });

  it("kunci stabil dan sah; prioritas mengikuti urutan PRD", () => {
    expect(suggestionKey("best-pillar", "TIKTOK", "pil-clay")).toBe("best-pillar:TIKTOK:pil-clay");
    expect(suggestionKey("low-ideas", null, "ide")).toBe("low-ideas:-:ide");
    expect(SUGGESTION_KEY_PATTERN.test("stale-content:-:abc.EDITING")).toBe(true);
    expect(SUGGESTION_KEY_PATTERN.test("x:FACEBOOK:a")).toBe(false);
    expect(SUGGESTION_KEY_PATTERN.test("x:-:a b")).toBe(false);
    expect(RULE_IDS.map((r) => RULE_PRIORITY[r])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(LOW_IDEAS_THRESHOLD).toBe(IDEA_BANK_LOW_THRESHOLD);
  });

  it("dismissUntil = 7 hari", () => {
    expect(dismissUntil(NOW).getTime() - NOW.getTime()).toBe(7 * 86_400_000);
  });

  it("urut prioritas lalu platform TikTok, Instagram", () => {
    const due = (platform: AnalyticsPlatform) => post({ platform, status: "NEED_H1", postedAt: daysAgo(2) });
    const result = computeSuggestions(
      input({ weeklyPostTarget: 3, newIdeaCount: 2, posts: [due("INSTAGRAM"), due("TIKTOK")] }),
    );
    expect(result.map((s) => [s.rule, s.platform])).toEqual([
      ["rhythm", null],
      ["pending-metrics", "TIKTOK"],
      ["pending-metrics", "INSTAGRAM"],
      ["low-ideas", null],
    ]);
  });

  it("saran yang disembunyikan tidak tampil", () => {
    const dismissed = new Set(["low-ideas:-:ide"]);
    expect(rulesOf(computeSuggestions(input({ newIdeaCount: 1, dismissed })))).toEqual([]);
  });
});

describe("1. Ritme terancam (E2)", () => {
  const readyContents = [
    content({ id: "ready-old", stage: "READY", stageChangedAt: daysAgo(5) }),
    content({ id: "ready-new", stage: "READY", stageChangedAt: daysAgo(1) }),
    content({ id: "ready-mid", stage: "READY", stageChangedAt: daysAgo(3) }),
    content({ id: "ready-scheduled", stage: "READY", stageChangedAt: daysAgo(9) }),
  ];

  it("Kamis, tayang + terjadwal < target → kurang N, maks. 2 konten siap yang belum terjadwal", () => {
    const tiktok = post({ contentId: "c-week", postedAt: wibToUtc("2026-11-10", "19:00") });
    const ig = post({ contentId: "c-week", platform: "INSTAGRAM", postedAt: wibToUtc("2026-11-10", "19:05") });
    const [s] = only(
      computeSuggestions(
        input({
          weeklyPostTarget: 4,
          posts: [tiktok, ig],
          scheduled: [
            { contentId: "c-sat", platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-14", "19:00") },
            { contentId: "ready-scheduled", platform: "TIKTOK", scheduledAt: wibToUtc("2026-11-17", "19:00") },
          ],
          contents: readyContents,
        }),
      ),
      "rhythm",
    );
    // TikTok + IG dari konten yang sama = 1 post; ditambah 1 terjadwal → 2 dari 4.
    expect(s).toMatchObject({ key: "rhythm:-:2026-11-09", platform: null, target: 4, planned: 2, missing: 2 });
    expect(s!.ready.map((c) => c.id)).toEqual(["ready-old", "ready-mid"]);
  });

  it("Rabu tidak aktif; Minggu 23.30 masih aktif", () => {
    const wed = computeSuggestions(input({ now: wibToUtc("2026-11-11", "23:59"), weeklyPostTarget: 3 }));
    expect(rulesOf(wed)).not.toContain("rhythm");
    const sun = computeSuggestions(input({ now: wibToUtc("2026-11-15", "23:30"), weeklyPostTarget: 3 }));
    expect(only(sun, "rhythm")[0]).toMatchObject({ missing: 3, ready: [] });
  });

  it("target terpenuhi (termasuk yang terjadwal) atau target 0 → tidak ada saran", () => {
    const scheduled = [1, 2, 3].map((i) => ({
      contentId: `s${i}`,
      platform: "TIKTOK" as const,
      scheduledAt: wibToUtc("2026-11-14", "19:00"),
    }));
    expect(rulesOf(computeSuggestions(input({ weeklyPostTarget: 3, scheduled })))).not.toContain("rhythm");
    expect(rulesOf(computeSuggestions(input({ weeklyPostTarget: 0 })))).not.toContain("rhythm");
  });

  it("post minggu lalu tidak dihitung", () => {
    const [s] = only(
      computeSuggestions(input({ weeklyPostTarget: 1, posts: [post({ postedAt: wibToUtc("2026-11-08", "23:59") })] })),
      "rhythm",
    );
    expect(s?.planned).toBe(0);
  });
});

describe("2. Metrik tertunda", () => {
  it("per platform: hitung Perlu H+1 dan Perlu H+7, kunci tetap per platform", () => {
    const result = computeSuggestions(
      input({
        posts: [
          post({ status: "NEED_H7", postedAt: daysAgo(10) }),
          post({ status: "NEED_H1", postedAt: daysAgo(2) }),
          post({ status: "NEED_H7", postedAt: daysAgo(20) }),
          post({ status: "WAITING_H7", postedAt: daysAgo(3) }),
          post({ status: "WAITING_H1", postedAt: daysAgo(0) }),
          post({ status: "COMPLETE" }),
        ],
      }),
    );
    expect(only(result, "pending-metrics")).toEqual([
      expect.objectContaining({ platform: "TIKTOK", needH1: 1, needH7: 2, key: "pending-metrics:TIKTOK:tertunda" }),
    ]);
  });

  it("disembunyikan: tetap tersembunyi saat sebagian diisi, muncul lagi jika ada post baru jatuh tempo", () => {
    const key = "pending-metrics:TIKTOK:tertunda";
    // Disembunyikan 1 hari lalu. Post 10 hari lalu sudah jatuh tempo H+7 tiga hari lalu (sebelum disembunyikan).
    const old = post({ status: "NEED_H7", postedAt: daysAgo(10) });
    const hiddenAt = new Map([[key, addWibDays(NOW, -1)]]);
    const dismissed = new Set([key]);
    expect(only(computeSuggestions(input({ posts: [old], dismissed, dismissedAt: hiddenAt })), "pending-metrics")).toEqual([]);
    // Tanpa waktu sembunyi: tetap tersembunyi sampai `until`.
    expect(only(computeSuggestions(input({ posts: [old], dismissed })), "pending-metrics")).toEqual([]);
    // Post yang tayang 30 jam lalu baru jatuh tempo H+1 enam jam lalu (setelah disembunyikan) → muncul lagi.
    const fresh = post({ status: "NEED_H1", postedAt: new Date(NOW.getTime() - 30 * 3_600_000) });
    expect(only(computeSuggestions(input({ posts: [old, fresh], dismissed, dismissedAt: hiddenAt })), "pending-metrics")).toEqual([
      expect.objectContaining({ needH1: 1, needH7: 1 }),
    ]);
    // Platform lain tidak terpengaruh.
    const ig = post({ status: "NEED_H7", postedAt: daysAgo(10), platform: "INSTAGRAM" });
    expect(only(computeSuggestions(input({ posts: [old, ig], dismissed, dismissedAt: hiddenAt })), "pending-metrics").map((s) => s.platform)).toEqual([
      "INSTAGRAM",
    ]);
  });

  it("tanpa post tertunda → tidak ada saran", () => {
    expect(computeSuggestions(input({ posts: [post({ status: "WAITING_H7" })] }))).toEqual([]);
  });
});

describe("3. Pipeline macet", () => {
  const contents = [
    content({ id: "c-edit", stage: "EDITING", stageChangedAt: daysAgo(9, "08:00") }),
    content({ id: "c-prod", stage: "PRODUCTION", stageChangedAt: daysAgo(8, "08:00") }),
    content({ id: "c-posted", stage: "POSTED", stageChangedAt: daysAgo(30) }),
    content({ id: "c-fresh", stage: "READY", stageChangedAt: daysAgo(7, "21:00") }),
  ];

  it("konten paling lama macet (> 7 hari, bukan Posted) + jumlah lainnya", () => {
    const [s] = only(computeSuggestions(input({ contents })), "stale-content");
    expect(s).toMatchObject({ key: "stale-content:-:c-edit.EDITING", content: { id: "c-edit", stage: "EDITING" }, days: 9, others: 1 });
  });

  it("menyembunyikan satu konten menampilkan konten macet berikutnya", () => {
    const [s] = only(
      computeSuggestions(input({ contents, dismissed: new Set(["stale-content:-:c-edit.EDITING"]) })),
      "stale-content",
    );
    expect(s).toMatchObject({ content: { id: "c-prod" }, others: 0 });
  });

  it("tidak ada yang macet → tidak ada saran", () => {
    expect(computeSuggestions(input({ contents: contents.slice(2) }))).toEqual([]);
  });
});

describe("4-6. Pilar, hook, dan jam terbaik (E1)", () => {
  const scores = (values: number[], partial: Partial<RulePost> = {}) =>
    values.map((relativeScore) => post({ relativeScore, ...partial }));

  it("median skor relatif ≥ 1,2 dengan ≥ 3 post → pilar terbaik per platform", () => {
    const posts = [
      ...scores([1.5, 1.6, 2.0], { pillar: clay }),
      ...scores([0.8, 0.9, 1.0], { pillar: gambar }),
      ...scores([3, 3], { pillar: tips }), // 2 post: data belum cukup
    ];
    const [s] = only(computeSuggestions(input({ posts })), "best-pillar");
    expect(s).toMatchObject({
      key: "best-pillar:TIKTOK:pil-clay",
      platform: "TIKTOK",
      group: { key: "pil-clay", label: "Proses Clay", postCount: 3, medianScore: 1.6 },
    });
  });

  it("batas 1,2: tepat 1,2 masuk; 1,19 tidak", () => {
    const at = only(computeSuggestions(input({ posts: scores([1.2, 1.2, 1.2], { hookType: hookTanya, format: null }) })), "best-pillar");
    expect(at[0]?.group.medianScore).toBe(1.2);
    const below = computeSuggestions(input({ posts: scores([1.19, 1.19, 1.19]) }));
    expect(rulesOf(below)).toEqual([]);
  });

  it("grup < 3 post tidak pernah jadi saran meski mediannya tinggi", () => {
    expect(computeSuggestions(input({ posts: scores([5, 5]) }))).toEqual([]);
  });

  it("platform terpisah: post Instagram tidak ikut grup TikTok", () => {
    const posts = [
      ...scores([2, 2], { pillar: clay }),
      ...scores([2], { pillar: clay, platform: "INSTAGRAM" }),
      ...scores([1.3, 1.4, 1.5], { pillar: gambar, platform: "INSTAGRAM", hookType: hookTanya }),
    ];
    const result = computeSuggestions(input({ posts }));
    expect(only(result, "best-pillar").map((s) => [s.platform, s.group.key, s.group.postCount])).toEqual([
      ["INSTAGRAM", "pil-gambar", 3],
    ]);
    expect(result.every((s) => s.platform !== "TIKTOK")).toBe(true);
  });

  it("post tanpa skor relatif dan skor relatif 0 (views = 0) tidak menghasilkan NaN", () => {
    const posts = [...scores([0, 0, 0]), post({ relativeScore: null }), post({ relativeScore: null })];
    expect(computeSuggestions(input({ posts }))).toEqual([]);
  });

  it("hook terbaik: tipe hook kosong tidak masuk grup", () => {
    const posts = [...scores([1.5, 1.5, 1.5], { hookType: null }), ...scores([1.3, 1.4, 1.3], { hookType: hookTanya, pillar: gambar })];
    const hooks = only(computeSuggestions(input({ posts })), "best-hook");
    expect(hooks.map((s) => s.group.key)).toEqual(["hook-tanya"]);
  });

  it("jam terbaik: kombinasi hari + jam WIB", () => {
    const saturday = (date: string) => post({ relativeScore: 1.4, postedAt: wibToUtc(date, "19:20"), pillar: gambar, hookType: null });
    const tuesday = (date: string) => post({ relativeScore: 1.25, postedAt: wibToUtc(date, "19:00"), pillar: tips, hookType: null });
    const posts = [
      saturday("2026-10-17"),
      saturday("2026-10-24"),
      saturday("2026-10-31"),
      tuesday("2026-10-20"),
      tuesday("2026-10-27"),
      tuesday("2026-11-03"),
    ];
    const [s] = only(computeSuggestions(input({ posts })), "best-time");
    expect(s).toMatchObject({ key: "best-time:TIKTOK:6-19", group: { label: "Sabtu 19.00", postCount: 3 } });
  });

  it("pemenang yang disembunyikan tidak digantikan juara dua", () => {
    const posts = [...scores([2, 2, 2], { pillar: clay }), ...scores([1.5, 1.5, 1.5], { pillar: gambar })];
    const result = computeSuggestions(input({ posts, dismissed: new Set(["best-pillar:TIKTOK:pil-clay"]) }));
    expect(only(result, "best-pillar")).toEqual([]);
  });
});

describe("7. Lanjutkan seri (E3)", () => {
  const project = { id: "proj-naga", title: "Patung kepala naga", stage: "IN_PROGRESS" as const };
  const parts = [
    content({ id: "part1", projectId: "proj-naga", seriesPart: 1, stage: "POSTED" }),
    content({ id: "part2", projectId: "proj-naga", seriesPart: 2, stage: "POSTED" }),
    content({ id: "part3", projectId: "proj-naga", seriesPart: 3, stage: "READY", title: "Part 3: detail" }),
  ];
  const posted = (contentId: string, relativeScore: number | null, platform: AnalyticsPlatform = "TIKTOK") =>
    post({ contentId, relativeScore, platform, hookType: null, pillar: { id: `pil-${contentId}`, name: contentId } });

  it("part tayang terakhir ≥ 1 dan part berikutnya belum tayang/terjadwal → saran ke konten part berikutnya", () => {
    const [s] = only(
      computeSuggestions(input({ projects: [project], contents: parts, posts: [posted("part1", 0.5), posted("part2", 1.1)] })),
      "continue-series",
    );
    expect(s).toMatchObject({
      key: "continue-series:TIKTOK:proj-naga.2",
      project: { id: "proj-naga" },
      part: 2,
      relativeScore: 1.1,
      nextPart: 3,
      nextContent: { id: "part3", title: "Part 3: detail", stage: "READY" },
    });
  });

  it("part berikutnya belum dibuat → nextContent null, nextPart = part + 1", () => {
    const [s] = only(
      computeSuggestions(input({ projects: [project], contents: parts.slice(0, 2), posts: [posted("part2", 1)] })),
      "continue-series",
    );
    expect(s).toMatchObject({ part: 2, nextPart: 3, nextContent: null });
  });

  it("negatif: skor < 1, belum ada skor relatif, part berikutnya terjadwal, atau proyek Selesai", () => {
    const run = (partial: Partial<RuleInput>) =>
      only(computeSuggestions(input({ projects: [project], contents: parts, ...partial })), "continue-series");
    expect(run({ posts: [posted("part2", 0.99)] })).toEqual([]);
    expect(run({ posts: [posted("part2", null)] })).toEqual([]);
    expect(
      run({
        posts: [posted("part2", 1.5)],
        scheduled: [{ contentId: "part3", platform: "INSTAGRAM", scheduledAt: wibToUtc("2026-11-14", "19:00") }],
      }),
    ).toEqual([]);
    expect(run({ projects: [{ ...project, stage: "DONE" }], posts: [posted("part2", 1.5)] })).toEqual([]);
  });

  it("dua platform di atas biasanya → satu saran di platform terkuat", () => {
    const result = only(
      computeSuggestions(
        input({ projects: [project], contents: parts, posts: [posted("part2", 1.1), posted("part2", 1.4, "INSTAGRAM")] }),
      ),
      "continue-series",
    );
    expect(result.map((s) => [s.platform, s.relativeScore])).toEqual([["INSTAGRAM", 1.4]]);
  });

  it("disembunyikan di platform terkuat → proyek tidak muncul lagi di platform lain", () => {
    const result = only(
      computeSuggestions(
        input({
          projects: [project],
          contents: parts,
          posts: [posted("part2", 1.1), posted("part2", 1.4, "INSTAGRAM")],
          dismissed: new Set(["continue-series:INSTAGRAM:proj-naga.2"]),
        }),
      ),
      "continue-series",
    );
    expect(result).toEqual([]);
  });

  it("part terakhir di satu platform dihitung per platform", () => {
    // Part 2 hanya tayang di TikTok; di Instagram part terakhir = part 1 (0,8) → tidak ada saran Instagram.
    const result = only(
      computeSuggestions(
        input({ projects: [project], contents: parts, posts: [posted("part1", 0.8, "INSTAGRAM"), posted("part2", 1.2)] }),
      ),
      "continue-series",
    );
    expect(result.map((s) => s.platform)).toEqual(["TIKTOK"]);
  });
});

describe("8. Crosspost tertinggal (E4)", () => {
  const strong = (partial: Partial<RulePost> = {}) =>
    post({ contentId: "c-x", relativeScore: 1.3, postedAt: daysAgo(10), hookType: null, ...partial });

  it("skor relatif ≥ 1,2, tayang ≤ 30 hari, belum ada versi tayang/terjadwal di platform lain", () => {
    const [s] = only(computeSuggestions(input({ posts: [strong()] })), "crosspost");
    expect(s).toMatchObject({
      key: "crosspost:TIKTOK:c-x",
      platform: "TIKTOK",
      missingPlatform: "INSTAGRAM",
      content: { id: "c-x" },
      relativeScore: 1.3,
    });
  });

  it("negatif: versi lain terjadwal atau tayang, skor 1,19, atau tayang 31 hari lalu", () => {
    const run = (partial: Partial<RuleInput>) => only(computeSuggestions(input(partial)), "crosspost");
    expect(
      run({ posts: [strong()], scheduled: [{ contentId: "c-x", platform: "INSTAGRAM", scheduledAt: daysAgo(-3) }] }),
    ).toEqual([]);
    expect(run({ posts: [strong(), strong({ platform: "INSTAGRAM", relativeScore: 0.5 })] })).toEqual([]);
    expect(run({ posts: [strong({ relativeScore: 1.19 })] })).toEqual([]);
    expect(run({ posts: [strong({ postedAt: daysAgo(31) })] })).toEqual([]);
  });

  it("satu saran per platform: skor relatif tertinggi", () => {
    const result = only(
      computeSuggestions(
        input({
          posts: [
            strong({ contentId: "a", relativeScore: 1.3 }),
            strong({ contentId: "b", relativeScore: 1.8 }),
            strong({ contentId: "c", relativeScore: 1.5, platform: "INSTAGRAM" }),
          ],
        }),
      ),
      "crosspost",
    );
    expect(result.map((s) => [s.platform, s.content.id, s.missingPlatform])).toEqual([
      ["TIKTOK", "b", "INSTAGRAM"],
      ["INSTAGRAM", "c", "TIKTOK"],
    ]);
  });
});

describe("9. Pilar terabaikan (E5)", () => {
  const pillar = (ref: { id: string; name: string }, targetShare: number, partial: Partial<RuleInput["pillars"][number]> = {}) => ({
    ...ref,
    targetShare,
    isActive: true,
    createdAt: daysAgo(100),
    ...partial,
  });
  const recent = [post({ pillar: clay, postedAt: daysAgo(3) }), post({ pillar: clay, postedAt: daysAgo(5) })];

  it("pilar aktif dengan porsi > 0 tanpa post 14 hari; porsi terbesar dulu", () => {
    const [s] = only(
      computeSuggestions(
        input({
          posts: [...recent, post({ pillar: tips, postedAt: daysAgo(20) })],
          pillars: [pillar(clay, 30), pillar(tips, 15), pillar(gambar, 30)],
        }),
      ),
      "neglected-pillar",
    );
    expect(s).toMatchObject({ key: "neglected-pillar:-:pil-gambar", pillar: { id: "pil-gambar" }, lastPostedAt: null, others: 1 });
  });

  it("negatif: total post < 3, porsi 0, nonaktif, pilar baru, atau ada post 13 hari lalu", () => {
    const run = (partial: Partial<RuleInput>) => only(computeSuggestions(input(partial)), "neglected-pillar");
    expect(run({ posts: recent, pillars: [pillar(tips, 15)] })).toEqual([]);
    const posts = [...recent, post({ pillar: gambar, postedAt: daysAgo(13, "21:00") })];
    expect(
      run({
        posts,
        pillars: [
          pillar(tips, 0),
          pillar({ id: "x", name: "Nonaktif" }, 10, { isActive: false }),
          pillar({ id: "y", name: "Baru" }, 10, { createdAt: daysAgo(5) }),
          pillar(gambar, 30),
        ],
      }),
    ).toEqual([]);
  });

  it("dua platform dari konten yang sama tetap dihitung satu konten", () => {
    const shared = [post({ contentId: "k1" }), post({ contentId: "k1", platform: "INSTAGRAM" }), post({ contentId: "k2" })];
    expect(only(computeSuggestions(input({ posts: shared, pillars: [pillar(tips, 15)] })), "neglected-pillar")).toEqual([]);
  });
});

describe("10. Ide menipis", () => {
  it("ide Baru < 5 → saran; 5 → tidak", () => {
    expect(only(computeSuggestions(input({ newIdeaCount: 3 })), "low-ideas")).toEqual([
      expect.objectContaining({ key: "low-ideas:-:ide", count: 3, threshold: 5 }),
    ]);
    expect(computeSuggestions(input({ newIdeaCount: 5 }))).toEqual([]);
  });
});
