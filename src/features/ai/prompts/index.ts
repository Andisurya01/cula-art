import type { AiFeature } from "../features";
import {
  artworkPhotosPrompt,
  type ArtworkPhotosContext,
  type ArtworkPhotosInput,
  type ArtworkPhotosOutput,
  type ArtworkPhotosRaw,
} from "./artwork-photos";
import { BASE_PROMPT_VERSION } from "./base";
import { captionPrompt, type CaptionContext, type CaptionInput, type CaptionOutput } from "./caption";
import type { ContentContext, ContentFormInput } from "./content-common";
import { hookPrompt, type HookOutput } from "./hook";
import { ideaExpandPrompt, type IdeaExpandContext, type IdeaExpandInput, type IdeaExpandOutput } from "./idea-expand";
import {
  projectIdeasPrompt,
  type ProjectIdeasContext,
  type ProjectIdeasInput,
  type ProjectIdeasOutput,
} from "./project-ideas";
import { scriptPrompt, type ScriptOutput } from "./script";
import type { FeaturePrompt } from "./types";

/** Tipe input (dari client), konteks (dari DB/set uji), jawaban model (raw), dan output (draf) per fitur. */
export type AiFeatureTypes = {
  "idea-expand": { input: IdeaExpandInput; context: IdeaExpandContext; output: IdeaExpandOutput; raw: IdeaExpandOutput };
  "project-ideas": {
    input: ProjectIdeasInput;
    context: ProjectIdeasContext;
    output: ProjectIdeasOutput;
    raw: ProjectIdeasOutput;
  };
  hook: { input: ContentFormInput; context: ContentContext; output: HookOutput; raw: HookOutput };
  script: { input: ContentFormInput; context: ContentContext; output: ScriptOutput; raw: ScriptOutput };
  caption: { input: CaptionInput; context: CaptionContext; output: CaptionOutput; raw: CaptionOutput };
  "artwork-photos": {
    input: ArtworkPhotosInput;
    context: ArtworkPhotosContext;
    output: ArtworkPhotosOutput;
    raw: ArtworkPhotosRaw;
  };
};

export type AiInput<F extends AiFeature> = AiFeatureTypes[F]["input"];
export type AiContext<F extends AiFeature> = AiFeatureTypes[F]["context"];
export type AiOutput<F extends AiFeature> = AiFeatureTypes[F]["output"];
export type AiRaw<F extends AiFeature> = AiFeatureTypes[F]["raw"];

export const FEATURE_PROMPTS: {
  [F in AiFeature]: FeaturePrompt<AiInput<F>, AiContext<F>, AiOutput<F>, AiRaw<F>>;
} = {
  "idea-expand": ideaExpandPrompt,
  "project-ideas": projectIdeasPrompt,
  hook: hookPrompt,
  script: scriptPrompt,
  caption: captionPrompt,
  "artwork-photos": artworkPhotosPrompt,
};

/** Versi yang dicatat di AiRun: versi fitur + versi instruksi dasar. */
export function promptVersionOf(feature: AiFeature): string {
  return `${FEATURE_PROMPTS[feature].version}+${BASE_PROMPT_VERSION}`;
}

export type ComposeOptions = {
  /** Instruksi tambahan dari kolom panel (mis. "lebih santai"). */
  instruction?: string | null;
  /** Hasil sebelumnya saat Buat ulang, supaya AI tahu apa yang perlu diubah. */
  previous?: unknown;
};

/** Teks pesan user: tugas + data + (hasil sebelumnya) + (instruksi tambahan). Foto ditambahkan run.ts. */
export function composeUserText<I, C, O, R>(def: FeaturePrompt<I, C, O, R>, context: C, options: ComposeOptions = {}) {
  const parts = [`<tugas>\n${def.task}\n</tugas>`, `<data>\n${escapeTags(def.render(context))}\n</data>`];
  if (options.previous !== undefined && options.previous !== null) {
    parts.push(
      `<hasil_sebelumnya>\n${escapeTags(JSON.stringify(options.previous))}\n</hasil_sebelumnya>\nBuat hasil baru yang berbeda dari hasil sebelumnya.`,
    );
  }
  const instruction = options.instruction?.trim();
  if (instruction) {
    parts.push(`<instruksi_tambahan>\n${escapeTags(instruction)}\n</instruksi_tambahan>`);
  }
  return parts.join("\n\n");
}

const PROMPT_TAGS = /<(\/?)(tugas|data|hasil_sebelumnya|instruksi_tambahan|panduan_ai)\b/gi;

/** Isi dari form tidak bisa menutup/membuka tag struktur prompt (mis. menulis "</data>" di judul). */
export function escapeTags(text: string): string {
  return text.replace(PROMPT_TAGS, "‹$1$2");
}
