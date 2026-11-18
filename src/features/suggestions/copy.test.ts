import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { RULE_IDS, RULE_PRIORITY, type Suggestion } from "@/lib/analytics/rules";
import { describeSuggestion, RULE_LABELS, suggestionLine } from "./copy";

const base = (rule: Suggestion["rule"], platform: Suggestion["platform"] = null) => ({
  key: `${rule}:${platform ?? "-"}:x`,
  priority: RULE_PRIORITY[rule],
  platform,
});

const SAMPLES: Suggestion[] = [
  {
    ...base("rhythm"),
    rule: "rhythm",
    weekStart: wibToUtc("2026-11-09"),
    target: 3,
    planned: 1,
    missing: 2,
    ready: [
      { id: "a", title: "Time-lapse tangan Part 2" },
      { id: "b", title: "Reveal naga" },
    ],
  },
  { ...base("pending-metrics", "TIKTOK"), rule: "pending-metrics", needH1: 1, needH7: 2 },
  {
    ...base("stale-content"),
    rule: "stale-content",
    content: { id: "c1", title: "Reveal patung naga", stage: "EDITING" },
    days: 9,
    others: 2,
  },
  {
    ...base("best-pillar", "INSTAGRAM"),
    rule: "best-pillar",
    group: { key: "pil-1", label: "Proses Clay", postCount: 5, medianScore: 1.6 },
  },
  { ...base("best-hook", "TIKTOK"), rule: "best-hook", group: { key: "h1", label: "Hasil di depan", postCount: 4, medianScore: 1.3 } },
  { ...base("best-time", "INSTAGRAM"), rule: "best-time", group: { key: "6-19", label: "Sabtu 19.00", postCount: 3, medianScore: 1.25 } },
  {
    ...base("continue-series", "TIKTOK"),
    rule: "continue-series",
    project: { id: "proj", title: "Patung kepala naga" },
    part: 2,
    relativeScore: 1.1,
    nextPart: 3,
    nextContent: null,
  },
  {
    ...base("crosspost", "TIKTOK"),
    rule: "crosspost",
    content: { id: "c9", title: "Gambar tangan 60 detik" },
    relativeScore: 1.45,
    missingPlatform: "INSTAGRAM",
  },
  {
    ...base("neglected-pillar"),
    rule: "neglected-pillar",
    pillar: { id: "pil-tips", name: "Tips dan Tutorial", targetShare: 15 },
    lastPostedAt: wibToUtc("2026-10-20"),
    others: 0,
  },
  { ...base("low-ideas"), rule: "low-ideas", count: 3, threshold: 5 },
];

describe("describeSuggestion", () => {
  it("setiap aturan punya label dan contoh", () => {
    expect(Object.keys(RULE_LABELS).sort()).toEqual([...RULE_IDS].sort());
    expect(SAMPLES.map((s) => s.rule)).toEqual([...RULE_IDS]);
  });

  it("teks berisi angka jadi dan tautan tindakan yang benar", () => {
    const views = SAMPLES.map(describeSuggestion);
    expect(views.map((v) => [v.title, v.message, v.href])).toEqual([
      [
        "Ritme terancam",
        "Masih kurang 2 post minggu ini (1 dari 3 tayang atau terjadwal). Konten siap: Time-lapse tangan Part 2 dan Reveal naga.",
        "/studio/kalender",
      ],
      ["Metrik tertunda di TikTok", "Isi metrik H+1 untuk 1 post dan H+7 untuk 2 post.", "/studio/postingan?platform=TIKTOK&status=PERLU"],
      ["Pipeline macet", "Reveal patung naga tertahan di Editing 9 hari. (+2 konten macet lain)", "/studio/pipeline/c1"],
      [
        "Pilar terbaik di Instagram",
        "Proses Clay: median skor relatif 1,60x dari 5 post. Jadwalkan 1 lagi.",
        "/studio/ide?pillar=pil-1",
      ],
      ["Hook terbaik di TikTok", "Hook Hasil di depan unggul: median skor relatif 1,30x dari 4 post.", "/studio/analitik"],
      [
        "Jam terbaik di Instagram",
        "Sabtu 19.00 WIB konsisten paling tinggi: median skor relatif 1,25x dari 3 post.",
        "/studio/analitik?platform=INSTAGRAM",
      ],
      ["Lanjutkan seri", "Part 2 Patung kepala naga 1,10x di TikTok. Siapkan Part 3.", "/studio/proyek/proj"],
      [
        "Crosspost tertinggal",
        "Gambar tangan 60 detik 1,45x di TikTok, belum tayang atau terjadwal di Instagram.",
        "/studio/pipeline/c9",
      ],
      ["Pilar terabaikan", "Belum ada post Tips dan Tutorial dalam 14 hari (porsi target 15%).", "/studio/ide?pillar=pil-tips"],
      ["Ide menipis", "Bank ide tinggal 3 ide Baru.", "/studio/ide"],
    ]);
    expect(views.every((v) => v.key && v.actionLabel)).toBe(true);
  });

  it("variasi: tanpa konten siap, hanya H+7, part berikutnya sudah ada, pilar belum pernah, bank ide kosong", () => {
    const [rhythm, pending, , , , , series, , neglected, low] = SAMPLES as [Suggestion, ...Suggestion[]];
    expect(describeSuggestion({ ...rhythm, ready: [] } as Suggestion).message).toContain("Belum ada konten Siap Posting");
    expect(describeSuggestion({ ...pending, needH1: 0 } as Suggestion).message).toBe("Isi metrik H+7 untuk 2 post.");
    const next = describeSuggestion({
      ...series,
      nextContent: { id: "p3", title: "Part 3: detail", stage: "EDITING" },
    } as Suggestion);
    expect(next).toMatchObject({
      message: "Part 2 Patung kepala naga 1,10x di TikTok. Part 3 (Part 3: detail) masih di Editing dan belum terjadwal.",
      actionLabel: "Buka Part 3",
      href: "/studio/pipeline/p3",
    });
    expect(describeSuggestion({ ...neglected, lastPostedAt: null, others: 1 } as Suggestion).message).toBe(
      "Belum pernah ada post Tips dan Tutorial (porsi target 15%). (+1 pilar lain)",
    );
    expect(describeSuggestion({ ...low, count: 0 } as Suggestion).message).toBe("Bank ide kosong. Catat beberapa ide baru.");
  });

  it("view bisa dikirim ke client (tanpa Date) dan suggestionLine", () => {
    const view = describeSuggestion(SAMPLES[0]!);
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
    expect(suggestionLine(view)).toMatch(/^Ritme terancam: Masih kurang 2 post/);
  });
});
