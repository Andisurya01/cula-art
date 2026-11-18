// Integrasi ke database test: + Ide cepat dan antrean ide offline (E10): sekali, tidak dobel.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import { createQuickIdea } from "./actions";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("createQuickIdea", () => {
  it("menyimpan ide Baru; requireAdmin dipanggil", async () => {
    const result = await createQuickIdea({ title: "  Gambar tangan  ", medium: "DRAWING" });
    expect(result.ok).toBe(true);
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(await db.idea.findFirstOrThrow()).toMatchObject({ title: "Gambar tangan", medium: "DRAWING", status: "NEW", offlineId: null });
  });

  it("offlineId sama dikirim ulang → ide yang sama, tidak dobel", async () => {
    const first = await createQuickIdea({ title: "Ide offline", offlineId: "dev-1" });
    const again = await createQuickIdea({ title: "Ide offline", offlineId: "dev-1" });
    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.data.id).toBe(first.data.id);
    expect(await db.idea.count()).toBe(1);
  });

  it("5 kiriman paralel dengan offlineId sama → satu ide", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createQuickIdea({ title: "Paralel", offlineId: "dev-par" })),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const ids = new Set(results.map((r) => (r.ok ? r.data.id : null)));
    expect(ids.size).toBe(1);
    expect(await db.idea.count()).toBe(1);
  });

  it("pilar nonaktif: tanpa offlineId ditolak, dari antrean disimpan tanpa pilar", async () => {
    const pillar = await db.pillar.create({ data: { name: "Lama", color: "#000", isActive: false } });
    expect((await createQuickIdea({ title: "Tolak", pillarId: pillar.id })).ok).toBe(false);
    const queued = await createQuickIdea({ title: "Dari antrean", pillarId: pillar.id, offlineId: "dev-2" });
    expect(queued.ok).toBe(true);
    expect(await db.idea.findMany({ select: { title: true, pillarId: true } })).toEqual([{ title: "Dari antrean", pillarId: null }]);
  });

  it("judul kosong atau offlineId tidak sah ditolak", async () => {
    expect((await createQuickIdea({ title: "  ", offlineId: "x" })).ok).toBe(false);
    expect((await createQuickIdea({ title: "a", offlineId: "x".repeat(101) })).ok).toBe(false);
    expect(await db.idea.count()).toBe(0);
  });
});
