import { describe, expect, it } from "vitest";
import type { ContentFormInput } from "@/features/ai/prompts/content-common";
import { createContentDraftRegistry, resolveContentDraft } from "./content-draft";

const saved: ContentFormInput = {
  contentId: "content-1",
  title: "Judul tersimpan",
  pillarId: "pillar-1",
  hookText: "Hook lama",
};

describe("createContentDraftRegistry", () => {
  it("null sebelum form detail konten terdaftar", () => {
    expect(createContentDraftRegistry().read()).toBeNull();
  });

  it("membaca isi form saat read dipanggil (bukan saat register)", () => {
    const registry = createContentDraftRegistry();
    let hookText = "Hook awal";
    registry.register(() => ({ ...saved, hookText }));
    hookText = "Hook dari AI, belum disimpan";
    expect(registry.read()?.hookText).toBe("Hook dari AI, belum disimpan");
  });

  it("pelepas hanya menghapus pembaca miliknya sendiri", () => {
    const registry = createContentDraftRegistry();
    const releaseOld = registry.register(() => ({ ...saved, title: "Lama" }));
    const releaseNew = registry.register(() => ({ ...saved, title: "Baru" }));
    releaseOld();
    expect(registry.read()?.title).toBe("Baru");
    releaseNew();
    expect(registry.read()).toBeNull();
  });
});

describe("resolveContentDraft", () => {
  it("tanpa draf memakai nilai tersimpan", () => {
    expect(resolveContentDraft(null, saved)).toBe(saved);
  });

  it("draf (belum disimpan) diutamakan", () => {
    const draft = { ...saved, hookText: "Hook baru" };
    expect(resolveContentDraft(draft, saved)).toEqual(draft);
  });

  it("judul draf kosong diganti judul tersimpan", () => {
    const result = resolveContentDraft({ ...saved, title: "  ", hookText: "Hook baru" }, saved);
    expect(result.title).toBe("Judul tersimpan");
    expect(result.hookText).toBe("Hook baru");
  });
});
