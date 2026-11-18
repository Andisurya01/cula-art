// Integrasi ke database test: masukan mesin aturan dari database sampai daftar saran.

import { beforeEach, describe, expect, it } from "vitest";
import type { Platform } from "@prisma/client";
import { db, resetDatabase } from "@/test/db";
import { addWibDays, wibToUtc } from "@/lib/date";
import { suggestionKey } from "@/lib/analytics/rules";
import { getRuleInput, getSuggestions, getSuggestionViews } from "./queries";

// Kamis 12 Nov 2026, 20.00 WIB.
const NOW = wibToUtc("2026-11-12", "20:00");
const daysAgo = (days: number) => addWibDays(NOW, -days);

async function pillar(name: string, targetShare = 30) {
  return db.pillar.create({ data: { name, color: "#f97316", targetShare, createdAt: daysAgo(100) } });
}

/** Konten tayang dengan snapshot H+7 berskor tepat `score` (views 1.000, likes = skor). */
async function postedContent(
  title: string,
  pillarId: string,
  posts: { platform: Platform; daysAgo: number; score: number }[],
) {
  return db.content.create({
    data: {
      title,
      stage: "POSTED",
      pillarId,
      posts: {
        create: posts.map((p) => ({
          platform: p.platform,
          postType: "VIDEO" as const,
          postedAt: daysAgo(p.daysAgo),
          url: "https://example.com/p",
          snapshots: {
            create: [{ kind: "H7" as const, views: 1000, likes: p.score, comments: 0, shares: 0, saves: 0, follows: 0 }],
          },
        })),
      },
    },
  });
}

beforeEach(resetDatabase);

describe("getSuggestions", () => {
  it("database kosong: hanya ritme (Kamis, target 3) dan ide menipis", async () => {
    const list = await getSuggestions(NOW);
    expect(list.map((s) => s.rule)).toEqual(["rhythm", "low-ideas"]);
  });

  it("aturan data dihitung per platform dari skor relatif, dan kunci tersembunyi disaring", async () => {
    const clay = await pillar("Proses Clay");
    const tiktok = [
      ["Lama 1", 40, 100],
      ["Lama 2", 35, 100],
      ["Lama 3", 30, 100],
      ["Naik 1", 25, 160],
      ["Naik 2", 20, 170],
      ["Naik 3", 15, 180],
    ] as const;
    const contents = [];
    for (const [title, ago, score] of tiktok) {
      contents.push(await postedContent(title, clay.id, [{ platform: "TIKTOK", daysAgo: ago, score }]));
    }
    // Instagram: dua post sangat tinggi tetap "data belum cukup" dan tidak memengaruhi TikTok.
    await postedContent("IG 1", clay.id, [{ platform: "INSTAGRAM", daysAgo: 12, score: 900 }]);
    await postedContent("IG 2", clay.id, [{ platform: "INSTAGRAM", daysAgo: 10, score: 950 }]);
    const ready = await db.content.create({ data: { title: "Siap tayang", stage: "READY", pillarId: clay.id } });

    const top = contents[5]!;
    await db.suggestionDismissal.createMany({
      data: [
        { key: suggestionKey("crosspost", "TIKTOK", top.id), until: addWibDays(NOW, 3) },
        // Sudah lewat: tidak menyembunyikan apa pun.
        { key: suggestionKey("best-pillar", "TIKTOK", clay.id), until: addWibDays(NOW, -1) },
      ],
    });

    const input = await getRuleInput(NOW);
    expect(input.dismissed).toEqual(new Set([suggestionKey("crosspost", "TIKTOK", top.id)]));
    expect(input.posts).toHaveLength(8);

    const list = await getSuggestions(NOW);
    const rhythm = list.find((s) => s.rule === "rhythm");
    expect(rhythm).toMatchObject({ ready: [{ id: ready.id, title: "Siap tayang" }] });

    const best = list.filter((s) => s.rule === "best-pillar");
    expect(best).toEqual([
      expect.objectContaining({ platform: "TIKTOK", group: expect.objectContaining({ key: clay.id, postCount: 3 }) }),
    ]);
    expect((best[0] as Extract<(typeof best)[number], { group: unknown }>).group.medianScore).toBeCloseTo(1.7);

    // Crosspost terkuat (1,8x) disembunyikan → berikutnya (1,7x) yang tampil, hanya di TikTok.
    const cross = list.filter((s) => s.rule === "crosspost");
    expect(cross.map((s) => [s.platform, s.key])).toEqual([["TIKTOK", suggestionKey("crosspost", "TIKTOK", contents[4]!.id)]]);

    const views = await getSuggestionViews(NOW);
    expect(views.map((v) => v.key)).toEqual(list.map((s) => s.key));
    expect(views.find((v) => v.rule === "best-pillar")?.message).toBe(
      "Proses Clay: median skor relatif 1,70x dari 3 post. Jadwalkan 1 lagi.",
    );
  });
});
