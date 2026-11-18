import { describe, expect, it, vi } from "vitest";
import { NETWORK_ERROR_MESSAGE } from "@/lib/action-client";
import {
  classifyResult,
  prepareQueue,
  queueBadgeText,
  syncQueue,
  toQuickIdeaInput,
  type QueuedIdea,
  type SendOutcome,
} from "./offline-queue";

vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));

const idea = (id: string, createdAt: number, partial: Partial<QueuedIdea> = {}): QueuedIdea => ({
  id,
  title: `Ide ${id}`,
  medium: null,
  createdAt,
  ...partial,
});

describe("prepareQueue", () => {
  it("antrean kosong", () => {
    expect(prepareQueue([])).toEqual({ valid: [], invalidIds: [] });
  });

  it("urut waktu dicatat lalu id; isian rusak dipisah (yang punya id bisa dibuang)", () => {
    const { valid, invalidIds } = prepareQueue([
      idea("b", 20),
      idea("a", 20),
      idea("c", 10),
      { id: "rusak", title: "   ", medium: null, createdAt: 1 },
      { id: "medium-aneh", title: "x", medium: "VIDEO", createdAt: 1 },
      { title: "tanpa id" },
      null,
      "teks",
    ]);
    expect(valid.map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(invalidIds).toEqual(["rusak", "medium-aneh"]);
  });

  it("judul dirapikan dan dibatasi 200 karakter", () => {
    expect(prepareQueue([idea("x", 1, { title: "  Gambar tangan  " })]).valid[0]!.title).toBe("Gambar tangan");
    expect(prepareQueue([idea("y", 1, { title: "a".repeat(201) })]).invalidIds).toEqual(["y"]);
  });
});

describe("toQuickIdeaInput", () => {
  it("offlineId = id antrean; medium dan pilar hanya jika ada", () => {
    expect(toQuickIdeaInput(idea("k1", 1))).toEqual({ title: "Ide k1", offlineId: "k1" });
    expect(toQuickIdeaInput(idea("k2", 1, { medium: "CLAY", pillarId: "p1" }))).toEqual({
      title: "Ide k2",
      medium: "CLAY",
      pillarId: "p1",
      offlineId: "k2",
    });
  });
});

describe("classifyResult", () => {
  it("berhasil → ok; gagal jaringan → retry; ditolak server → invalid", () => {
    expect(classifyResult({ ok: true, data: { id: "x" } })).toBe("ok");
    expect(classifyResult({ ok: false, error: NETWORK_ERROR_MESSAGE })).toBe("retry");
    expect(classifyResult({ ok: false, error: "Judul wajib diisi", fieldErrors: { title: ["Judul wajib diisi"] } })).toBe("invalid");
  });
});

describe("syncQueue", () => {
  function setup(outcomes: Record<string, SendOutcome | Error>) {
    const store = new Map<string, unknown>();
    const sent: string[] = [];
    const deps = {
      send: vi.fn(async (item: QueuedIdea) => {
        sent.push(item.id);
        const outcome = outcomes[item.id] ?? "ok";
        if (outcome instanceof Error) throw outcome;
        return outcome;
      }),
      remove: vi.fn(async (id: string) => {
        store.delete(id);
      }),
    };
    return { store, sent, deps };
  }

  it("antrean kosong → tidak mengirim apa pun", async () => {
    const { deps } = setup({});
    expect(await syncQueue([], deps)).toEqual({ synced: [], dropped: [], remaining: 0 });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("mengirim berurutan; dihapus dari antrean hanya setelah berhasil", async () => {
    const { deps, sent } = setup({});
    const report = await syncQueue([idea("b", 2), idea("a", 1)], deps);
    expect(sent).toEqual(["a", "b"]);
    expect(report.synced.map((i) => i.id)).toEqual(["a", "b"]);
    expect(deps.remove.mock.calls.map(([id]) => id)).toEqual(["a", "b"]);
    // Setiap hapus terjadi setelah kirimnya selesai.
    expect(deps.send.mock.invocationCallOrder[0]).toBeLessThan(deps.remove.mock.invocationCallOrder[0]!);
  });

  it("gagal jaringan menghentikan pengiriman; sisanya tetap di antrean", async () => {
    const { deps, sent } = setup({ b: "retry" });
    const report = await syncQueue([idea("a", 1), idea("b", 2), idea("c", 3)], deps);
    expect(sent).toEqual(["a", "b"]);
    expect(report).toMatchObject({ remaining: 2 });
    expect(report.synced.map((i) => i.id)).toEqual(["a"]);
    expect(deps.remove.mock.calls.map(([id]) => id)).toEqual(["a"]);
  });

  it("error tak terduga saat kirim = retry (tidak dibuang)", async () => {
    const { deps } = setup({ a: new Error("putus") });
    const report = await syncQueue([idea("a", 1)], deps);
    expect(report).toEqual({ synced: [], dropped: [], remaining: 1 });
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("ditolak server → dibuang dan dilaporkan, antrean lanjut", async () => {
    const { deps } = setup({ a: "invalid" });
    const report = await syncQueue([idea("a", 1), idea("b", 2)], deps);
    expect(report.dropped.map((i) => i.id)).toEqual(["a"]);
    expect(report.synced.map((i) => i.id)).toEqual(["b"]);
    expect(report.remaining).toBe(0);
  });

  it("isian rusak dibuang tanpa dikirim", async () => {
    const { deps } = setup({});
    await syncQueue([{ id: "rusak", title: "" }, idea("a", 1)], deps);
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.remove.mock.calls.map(([id]) => id)).toEqual(["rusak", "a"]);
  });
});

describe("queueBadgeText", () => {
  it("tanpa antrean → null", () => {
    expect(queueBadgeText(0)).toBeNull();
    expect(queueBadgeText(2)).toBe("2 ide menunggu sinkron");
  });
});
