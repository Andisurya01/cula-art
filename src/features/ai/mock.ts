import "server-only";
import { APIConnectionError, APIUserAbortError } from "@anthropic-ai/sdk";
import { AiStreamError, type StreamOptions, type StreamResult } from "./client";
import type { AiFeature } from "./features";
import { MOCK_MODEL } from "./models";
import { FEATURE_PROMPTS, type AiContext, type AiOutput, type AiRaw } from "./prompts";
import type { FeaturePrompt, TaxonomyNames } from "./prompts/types";

// Mode uji (AI_MOCK=1): jawaban contoh yang lolos skema, dialirkan bertahap seperti streaming asli, biaya 0.
// Instruksi tambahan "uji:error", "uji:tolak", "uji:terpotong", "uji:lambat" mensimulasikan kegagalan.

type Samples = { [F in AiFeature]: (names: TaxonomyNames, ctx: AiContext<F>) => AiRaw<F> };

const pick = (list: string[], i: number) => (list.length ? list[i % list.length] : null);

const SAMPLES: Samples = {
  "idea-expand": (names, ctx) => ({
    variations: ["Time-lapse", "Kesalahan pemula", "Before/after"].map((angle, i) => ({
      title: `${ctx.title}: ${angle.toLowerCase()}`,
      angle: `Contoh sudut pandang ${i + 1}: tunjukkan ${ctx.title.toLowerCase()} lewat ${angle.toLowerCase()} dari awal sampai akhir.`,
      pillar: pick(names.pillars, i),
      format: pick(names.formats, i),
      hookType: pick(names.hookTypes, i),
      reason: "Jawaban contoh mode uji, bukan dari AI.",
    })),
    notes: null,
  }),
  "project-ideas": (names, ctx) => ({
    ideas: ["Armature", "Bentuk dasar", "Detail", "Reveal"].map((stage, i) => ({
      title: `${ctx.title} Part ${ctx.contents.length + i + 1}: ${stage}`,
      angle: `Rekam tahap ${stage.toLowerCase()} dari proyek ${ctx.title} (tahap sekarang: ${ctx.stage}).`,
      seriesPart: ctx.contents.length + i + 1,
      pillar: pick(names.pillars, i),
      format: pick(names.formats, i),
      hookType: pick(names.hookTypes, i),
      reason: `Contoh mode uji${ctx.photos.length ? ` dengan ${ctx.photos.length} foto` : " tanpa foto"}.`,
    })),
    notes: null,
  }),
  hook: (_names, ctx) => ({
    hooks: [1, 2, 3, 4, 5].map((n) => ({
      text: `Hook contoh ${n}: ${ctx.title}${ctx.hookType ? ` (${ctx.hookType})` : ""}`,
      note: n % 2 ? "Teks di layar di atas klip hasil akhir." : "Voice-over sambil menunjukkan proses.",
    })),
    notes: ctx.hookType ? null : "Tipe hook belum dipilih, jadi tipenya divariasikan.",
  }),
  script: (_names, ctx) => ({
    script: [
      `0-3 dtk: ${ctx.hookText ?? `Hook untuk "${ctx.title}"`}`,
      "3-12 dtk: Tunjukkan alat dan bahan, jelaskan tujuan sesi ini.",
      "12-25 dtk: Proses utama dipercepat (time-lapse), teks di layar menandai tiap tahap.",
      "25-30 dtk: Hasil akhir + CTA: simpan video ini untuk latihan berikutnya.",
    ].join("\n"),
    shotList: [
      "1. Close-up hasil akhir (untuk hook), cahaya samping.",
      "2. Overhead meja kerja: alat dan bahan.",
      "3. Overhead time-lapse proses utama.",
      "4. Close-up detail tangan saat finishing.",
    ].join("\n"),
    targetDurationSec: ctx.targetDurationSec ?? 30,
    notes: "Jawaban contoh mode uji.",
  }),
  caption: (_names, ctx) => ({
    options: [
      {
        caption: `${ctx.title}. Contoh caption ${ctx.platform} yang bercerita singkat tentang prosesnya.`,
        hashtags: ["#belajargambar", "#prosesberkarya", "#contoh"],
      },
      {
        caption: `Menurut kalian bagian mana yang paling susah dari ${ctx.title.toLowerCase()}? Tulis di komentar ya.`,
        hashtags: ["#seniman", "#clay", "#contoh"],
      },
    ],
    notes: "Jawaban contoh mode uji; set hashtag tidak dibaca.",
  }),
  "artwork-photos": (_names, ctx) => ({
    alts: ctx.photos.slice(0, PHOTO_NUMBERS.length).map((p, i) => ({
      photo: PHOTO_NUMBERS[i]!,
      alt: `${ctx.title ?? "Karya"}, ${p.isProcess ? "tahap proses" : "tampak"} ${i + 1} (teks contoh)`,
    })),
    summary: `${ctx.title ?? "Karya ini"} dalam satu kalimat contoh.`,
    description: [
      `Paragraf contoh pertama tentang ${ctx.title ?? "karya ini"}${ctx.medium ? ` (${ctx.medium})` : ""}.`,
      "Paragraf contoh kedua tentang proses dan tantangannya.",
    ].join("\n\n"),
    notes: ctx.materials ? null : "Bahan belum diisi, jadi tidak disebutkan.",
  }),
};

const PHOTO_NUMBERS = ["1", "2", "3", "4"] as const;

/** Jawaban contoh dalam bentuk jawaban model (sebelum `normalize`). */
export function mockRawOutput<F extends AiFeature>(feature: F, names: TaxonomyNames, ctx: AiContext<F>): AiRaw<F> {
  return SAMPLES[feature](names, ctx);
}

/** Jawaban contoh setelah `normalize` (bentuk yang diterima form). */
export function mockOutput<F extends AiFeature>(feature: F, names: TaxonomyNames, ctx: AiContext<F>): AiOutput<F> {
  const def = FEATURE_PROMPTS[feature] as FeaturePrompt<unknown, AiContext<F>, AiOutput<F>, AiRaw<F>>;
  const raw = mockRawOutput(feature, names, ctx);
  return def.normalize ? def.normalize(raw, ctx) : (raw as unknown as AiOutput<F>);
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new APIUserAbortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(new APIUserAbortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });

export async function streamMock(
  output: unknown,
  options: StreamOptions & { instruction?: string | null; promptChars: number },
): Promise<StreamResult> {
  const instruction = options.instruction ?? "";
  const json = JSON.stringify(
    instruction && output && typeof output === "object"
      ? { ...output, notes: `Mode uji, instruksi diterima: "${instruction}".` }
      : output,
  );
  const usage = (outputChars: number) => ({
    input_tokens: Math.ceil(options.promptChars / 4),
    output_tokens: Math.ceil(outputChars / 4),
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  });

  if (instruction.includes("uji:error")) {
    await sleep(300, options.signal).catch((e) => {
      throw new AiStreamError(e, null);
    });
    throw new AiStreamError(new APIConnectionError({ message: "Simulasi gangguan koneksi (mode uji)." }), null);
  }
  if (instruction.includes("uji:tolak")) {
    return { stopReason: "refusal", text: "", usage: usage(0), model: MOCK_MODEL };
  }

  const delay = instruction.includes("uji:lambat") ? 150 : 25;
  const end = instruction.includes("uji:terpotong") ? Math.floor(json.length / 2) : json.length;
  let text = "";
  try {
    for (let i = 0; i < end; i += 24) {
      await sleep(delay, options.signal);
      text = json.slice(0, Math.min(i + 24, end));
      options.onText(text);
    }
  } catch (error) {
    throw new AiStreamError(error, usage(text.length));
  }
  return {
    stopReason: end < json.length ? "max_tokens" : "end_turn",
    text,
    usage: usage(text.length),
    model: MOCK_MODEL,
  };
}
