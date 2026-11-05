import { describe, expect, it } from "vitest";
import type { IdeaVariation } from "@/features/ai/prompts/idea-expand";
import {
  IDEA_NOTES_MAX,
  IDEA_TITLE_MAX,
  ideaExpandInputFromForm,
  variationNotes,
  variationToIdeaFields,
} from "./ai-expand";

const variation: IdeaVariation = {
  title: "Kucing clay tidur dalam 60 detik",
  angle: "Time-lapse dari bola clay sampai kucing meringkuk.",
  pillar: "Proses Clay",
  format: "Time-lapse",
  hookType: "Hasil di depan",
  reason: "Hasil akhir yang lucu memancing orang menonton sampai habis.",
};

const pillars = [
  { id: "p-clay", name: "Proses Clay" },
  { id: "p-tips", name: "Tips dan Tutorial" },
];

describe("ideaExpandInputFromForm", () => {
  it("menyusun input dari nilai form; string kosong jadi null", () => {
    expect(
      ideaExpandInputFromForm({ title: "  Kucing clay  ", notes: "   ", medium: null, pillarId: null }),
    ).toEqual({ ideaId: null, title: "Kucing clay", notes: null, medium: null, pillarId: null });
  });

  it("menyertakan id ide saat edit, medium, pilar, dan catatan", () => {
    expect(
      ideaExpandInputFromForm(
        { title: "Kucing", notes: " pakai clay putih ", medium: "CLAY", pillarId: "p-clay" },
        "idea-1",
      ),
    ).toEqual({ ideaId: "idea-1", title: "Kucing", notes: "pakai clay putih", medium: "CLAY", pillarId: "p-clay" });
  });

  it("memotong judul dan catatan ke batas schema", () => {
    const input = ideaExpandInputFromForm({
      title: "a".repeat(250),
      notes: "b".repeat(2500),
      medium: null,
      pillarId: null,
    });
    expect(input.title).toHaveLength(IDEA_TITLE_MAX);
    expect(input.notes).toHaveLength(IDEA_NOTES_MAX);
  });
});

describe("variationNotes", () => {
  it("sudut pandang + saran format/tipe hook + alasan", () => {
    expect(variationNotes(variation)).toBe(
      "Time-lapse dari bola clay sampai kucing meringkuk.\n\n" +
        "Saran AI: format Time-lapse, tipe hook Hasil di depan.\n\n" +
        "Hasil akhir yang lucu memancing orang menonton sampai habis.",
    );
  });

  it("hanya menulis saran yang ada", () => {
    expect(variationNotes({ ...variation, format: null })).toContain("Saran AI: tipe hook Hasil di depan.");
    expect(variationNotes({ ...variation, hookType: null })).toContain("Saran AI: format Time-lapse.");
  });

  it("tanpa saran format/hook dan bagian kosong dilewati", () => {
    expect(variationNotes({ ...variation, format: null, hookType: null, reason: "  " })).toBe(
      "Time-lapse dari bola clay sampai kucing meringkuk.",
    );
    expect(variationNotes({ angle: "", format: null, hookType: null, reason: "" })).toBe("");
  });

  it("maksimal 2000 karakter", () => {
    const notes = variationNotes({ ...variation, angle: "x".repeat(1990), reason: "y".repeat(500) });
    expect(notes.length).toBeLessThanOrEqual(IDEA_NOTES_MAX);
    expect(notes.startsWith("x".repeat(1990))).toBe(true);
  });
});

describe("variationToIdeaFields", () => {
  const fallback = { title: "Judul lama", pillarId: "p-tips" };

  it("judul, catatan, dan pilar dari nama (tanpa peduli huruf besar)", () => {
    expect(variationToIdeaFields({ ...variation, pillar: "proses clay" }, pillars, fallback)).toEqual({
      title: "Kucing clay tidur dalam 60 detik",
      notes: variationNotes(variation),
      pillarId: "p-clay",
    });
  });

  it("pilar lama dipertahankan jika nama tidak cocok atau kosong", () => {
    expect(variationToIdeaFields({ ...variation, pillar: "Pilar Lain" }, pillars, fallback).pillarId).toBe("p-tips");
    expect(variationToIdeaFields({ ...variation, pillar: null }, pillars, fallback).pillarId).toBe("p-tips");
    expect(
      variationToIdeaFields({ ...variation, pillar: null }, pillars, { ...fallback, pillarId: null }).pillarId,
    ).toBeNull();
  });

  it("judul kosong dari AI → judul lama; judul panjang dipotong", () => {
    expect(variationToIdeaFields({ ...variation, title: "  " }, pillars, fallback).title).toBe("Judul lama");
    expect(variationToIdeaFields({ ...variation, title: "j".repeat(300) }, pillars, fallback).title).toHaveLength(
      IDEA_TITLE_MAX,
    );
  });
});
