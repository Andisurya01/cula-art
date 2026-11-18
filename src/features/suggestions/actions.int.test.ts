// Integrasi ke database test: aksi "Sembunyikan 7 hari".

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import { dismissSuggestion } from "./actions";
import { getSuggestions } from "./queries";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const DAY = 86_400_000;

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("dismissSuggestion", () => {
  it("menyimpan kunci 7 hari, memperpanjang jika diulang, dan saran hilang dari daftar", async () => {
    const before = Date.now();
    const result = await dismissSuggestion({ key: "low-ideas:-:ide" });
    expect(result.ok).toBe(true);
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/studio");
    expect(revalidatePath).toHaveBeenCalledWith("/studio/review");

    const row = await db.suggestionDismissal.findUniqueOrThrow({ where: { key: "low-ideas:-:ide" } });
    expect(row.until.getTime() - before).toBeGreaterThanOrEqual(7 * DAY - 1000);
    expect(row.until.getTime() - before).toBeLessThanOrEqual(7 * DAY + 5000);

    await db.suggestionDismissal.update({ where: { id: row.id }, data: { until: new Date(before + DAY) } });
    expect((await dismissSuggestion({ key: "low-ideas:-:ide" })).ok).toBe(true);
    const again = await db.suggestionDismissal.findMany();
    expect(again).toHaveLength(1);
    expect(again[0]!.until.getTime() - before).toBeGreaterThan(6 * DAY);

    expect((await getSuggestions(new Date())).map((s) => s.rule)).not.toContain("low-ideas");
  });

  it("kunci tidak sah ditolak tanpa menulis apa pun", async () => {
    for (const key of ["", "low-ideas", "low-ideas:FACEBOOK:x", "x:-:a b", `a:-:${"x".repeat(300)}`, 12]) {
      expect((await dismissSuggestion({ key })).ok).toBe(false);
    }
    expect(await db.suggestionDismissal.count()).toBe(0);
  });

  it("baris yang sudah lewat dirapikan", async () => {
    await db.suggestionDismissal.create({ data: { key: "rhythm:-:2026-01-05", until: new Date(Date.now() - DAY) } });
    await dismissSuggestion({ key: "best-pillar:TIKTOK:abc" });
    expect((await db.suggestionDismissal.findMany()).map((r) => r.key)).toEqual(["best-pillar:TIKTOK:abc"]);
  });
});
