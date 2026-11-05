// Daftar fitur Asisten AI (dipakai client dan server). Satu fitur = satu tombol Bantu AI + satu prompt.

export const AI_FEATURES = [
  "idea-expand",
  "project-ideas",
  "hook",
  "script",
  "caption",
  "artwork-photos",
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  "idea-expand": "Kembangkan ide",
  "project-ideas": "Ide dari proyek",
  hook: "Hook",
  script: "Script & shot list",
  caption: "Caption & hashtag",
  "artwork-photos": "Karya dari foto",
};

export function isAiFeature(value: unknown): value is AiFeature {
  return typeof value === "string" && (AI_FEATURES as readonly string[]).includes(value);
}

/** Maks. foto yang dikirim untuk "Karya dari foto" (di sini, bukan di file prompt, supaya client tidak memuat teks prompt). */
export const MAX_ARTWORK_AI_PHOTOS = 4;

/** Jenis data yang menjadi sasaran panggilan (`AiRun.targetType`). EVAL = set uji. */
export const AI_TARGET_TYPES = ["IDEA", "PROJECT", "CONTENT", "POST", "ARTWORK", "EVAL"] as const;
export type AiTargetType = (typeof AI_TARGET_TYPES)[number];
