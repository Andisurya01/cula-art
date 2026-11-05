import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import {
  AI_EXAMPLE_KIND_LABELS,
  CAPTION_LENGTH_LABELS,
  EMOJI_LABELS,
  ENGLISH_MIX_LABELS,
  FORMALITY_LABELS,
  type AiGuideContent,
  type PlatformHashtags,
} from "./guide-schema";

// Render Panduan AI menjadi teks prompt sistem. Harus deterministik: input yang sama → byte yang sama,
// supaya awalan prompt bisa dibaca dari cache (tanpa tanggal, id acak, atau urutan yang berubah-ubah).

export type GuideTaxonomy = {
  pillars: { id: string; name: string; description: string | null }[];
  formats: string[];
  hookTypes: string[];
};

const EMPTY = "(belum diisi)";

export function renderGuide(guide: AiGuideContent, taxonomy: GuideTaxonomy): string {
  return [
    "<panduan_ai>",
    section("gaya_bahasa", renderVoice(guide)),
    section("contoh_terbaik", renderExamples(guide)),
    section("fakta_kreator_dan_karya", guide.creatorFacts ?? EMPTY),
    section("hashtag", renderHashtags(guide, taxonomy)),
    section("hindari", guide.avoidNotes ?? EMPTY),
    section("kategori", renderTaxonomy(taxonomy)),
    "</panduan_ai>",
  ].join("\n");
}

function section(tag: string, body: string): string {
  return `<${tag}>\n${body.trim()}\n</${tag}>`;
}

function renderVoice({ voice, voiceNotes }: AiGuideContent): string {
  const lines = [
    voice.formality && `- Nada: ${FORMALITY_LABELS[voice.formality]}`,
    voice.englishMix && `- Campuran bahasa Inggris: ${ENGLISH_MIX_LABELS[voice.englishMix]}`,
    voice.greeting && `- Sapaan ke penonton: "${voice.greeting}"`,
    voice.emoji && `- Emoji: ${EMOJI_LABELS[voice.emoji]}`,
    voice.captionLength && `- Panjang caption: ${CAPTION_LENGTH_LABELS[voice.captionLength]}`,
    voice.ctas && `- CTA favorit: ${voice.ctas}`,
    voiceNotes && `- Catatan: ${voiceNotes}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : EMPTY;
}

function renderExamples({ examples }: AiGuideContent): string {
  if (examples.length === 0) return EMPTY;
  return examples
    .map((ex) => {
      const platform = ex.platform ? ` platform="${PLATFORM_LABELS[ex.platform]}"` : "";
      return `<contoh jenis="${AI_EXAMPLE_KIND_LABELS[ex.kind]}"${platform}>\n${ex.text}\n</contoh>`;
    })
    .join("\n");
}

function renderHashtags({ hashtagSets }: AiGuideContent, taxonomy: GuideTaxonomy): string {
  const lines: string[] = [];
  const general = renderPlatformTags(hashtagSets.general);
  if (general) lines.push(`Umum (semua pilar):\n${general}`);
  for (const pillar of taxonomy.pillars) {
    const tags = hashtagSets.pillars[pillar.id];
    const rendered = tags && renderPlatformTags(tags);
    if (rendered) lines.push(`Pilar ${pillar.name}:\n${rendered}`);
  }
  return lines.length ? lines.join("\n") : EMPTY;
}

function renderPlatformTags(tags: PlatformHashtags): string {
  return PLATFORMS.filter((p) => tags[p].length > 0)
    .map((p) => `- ${PLATFORM_LABELS[p]}: ${tags[p].join(" ")}`)
    .join("\n");
}

function renderTaxonomy(taxonomy: GuideTaxonomy): string {
  const pillars = taxonomy.pillars.map((p) => (p.description ? `- ${p.name}: ${p.description}` : `- ${p.name}`));
  return [
    `Pilar konten:\n${pillars.join("\n") || EMPTY}`,
    `Format: ${taxonomy.formats.join(", ") || EMPTY}`,
    `Tipe hook: ${taxonomy.hookTypes.join(", ") || EMPTY}`,
  ].join("\n");
}
