// Teks dan tautan tindakan untuk saran dari mesin aturan (fungsi murni, aman di client dan server).
// Angka sudah dihitung src/lib/analytics/rules.ts; di sini hanya diformat. Satu saran = satu platform.

import { NEGLECTED_PILLAR_DAYS, type RuleId, type Suggestion } from "@/lib/analytics/rules";
import type { AnalyticsPlatform } from "@/lib/analytics/metrics";
import { CONTENT_STAGE_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { analyticsHref, DEFAULT_ANALYTICS_FILTERS } from "@/features/analytics/schema";
import { DEFAULT_IDEA_FILTERS, ideaFiltersToQuery } from "@/features/ideas/schema";
import { formatRelative } from "@/features/metrics/format";
import { EMPTY_POST_FILTERS, postFiltersToQuery } from "@/features/metrics/post-filters";

/** Bentuk saran untuk UI dan AI: serializable (tanpa Date), aman dikirim ke client component. */
export type SuggestionView = {
  key: string;
  rule: RuleId;
  priority: number;
  platform: AnalyticsPlatform | null;
  title: string;
  message: string;
  actionLabel: string;
  href: string;
};

export const RULE_LABELS: Record<RuleId, string> = {
  rhythm: "Ritme terancam",
  "pending-metrics": "Metrik tertunda",
  "stale-content": "Pipeline macet",
  "best-pillar": "Pilar terbaik",
  "best-hook": "Hook terbaik",
  "best-time": "Jam terbaik",
  "continue-series": "Lanjutkan seri",
  crosspost: "Crosspost tertinggal",
  "neglected-pillar": "Pilar terabaikan",
  "low-ideas": "Ide menipis",
};

const withQuery = (path: string, query: string) => (query ? `${path}?${query}` : path);
const ideasHref = (pillarId: string | null) => withQuery(routes.studio.ideas, ideaFiltersToQuery({ ...DEFAULT_IDEA_FILTERS, pillarId }));

/** "A", "A dan B", "A, B, dan C". */
function joinTitles(titles: readonly string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  return `${titles.slice(0, -1).join(", ")}${titles.length > 2 ? "," : ""} dan ${titles.at(-1)}`;
}

const plusOthers = (count: number, noun: string) => (count > 0 ? ` (+${count} ${noun} lain)` : "");

type Text = Pick<SuggestionView, "title" | "message" | "actionLabel" | "href">;

function text(s: Suggestion): Text {
  const on = s.platform ? ` di ${PLATFORM_LABELS[s.platform]}` : "";
  switch (s.rule) {
    case "rhythm":
      return {
        title: RULE_LABELS.rhythm,
        message:
          `Masih kurang ${s.missing} post minggu ini (${s.planned} dari ${s.target} tayang atau terjadwal).` +
          (s.ready.length
            ? ` Konten siap: ${joinTitles(s.ready.map((c) => c.title))}.`
            : " Belum ada konten Siap Posting yang belum terjadwal."),
        actionLabel: "Buka Kalender",
        href: routes.studio.calendar,
      };
    case "pending-metrics": {
      const parts = [
        s.needH1 > 0 ? `H+1 untuk ${s.needH1} post` : null,
        s.needH7 > 0 ? `H+7 untuk ${s.needH7} post` : null,
      ].filter(Boolean);
      return {
        title: `${RULE_LABELS["pending-metrics"]}${on}`,
        message: `Isi metrik ${parts.join(" dan ")}.`,
        actionLabel: "Isi metrik",
        href: withQuery(routes.studio.posts, postFiltersToQuery({ ...EMPTY_POST_FILTERS, platform: s.platform, status: "PERLU" })),
      };
    }
    case "stale-content":
      return {
        title: RULE_LABELS["stale-content"],
        message: `${s.content.title} tertahan di ${CONTENT_STAGE_LABELS[s.content.stage]} ${s.days} hari.${plusOthers(s.others, "konten macet")}`,
        actionLabel: "Buka konten",
        href: routes.studio.content(s.content.id),
      };
    case "best-pillar":
      return {
        title: `${RULE_LABELS["best-pillar"]}${on}`,
        message: `${s.group.label}: median skor relatif ${formatRelative(s.group.medianScore)} dari ${s.group.postCount} post. Jadwalkan 1 lagi.`,
        actionLabel: `Lihat ide ${s.group.label}`,
        href: ideasHref(s.group.key),
      };
    case "best-hook":
      return {
        title: `${RULE_LABELS["best-hook"]}${on}`,
        message: `Hook ${s.group.label} unggul: median skor relatif ${formatRelative(s.group.medianScore)} dari ${s.group.postCount} post.`,
        actionLabel: "Lihat Analitik",
        href: analyticsHref({ ...DEFAULT_ANALYTICS_FILTERS, platform: s.platform ?? DEFAULT_ANALYTICS_FILTERS.platform }),
      };
    case "best-time":
      return {
        title: `${RULE_LABELS["best-time"]}${on}`,
        message: `${s.group.label} WIB konsisten paling tinggi: median skor relatif ${formatRelative(s.group.medianScore)} dari ${s.group.postCount} post.`,
        actionLabel: "Lihat Analitik",
        href: analyticsHref({ ...DEFAULT_ANALYTICS_FILTERS, platform: s.platform ?? DEFAULT_ANALYTICS_FILTERS.platform }),
      };
    case "continue-series":
      return {
        title: RULE_LABELS["continue-series"],
        message:
          `Part ${s.part} ${s.project.title} ${formatRelative(s.relativeScore)}${on}. ` +
          (s.nextContent
            ? `Part ${s.nextPart} (${s.nextContent.title}) masih di ${CONTENT_STAGE_LABELS[s.nextContent.stage]} dan belum terjadwal.`
            : `Siapkan Part ${s.nextPart}.`),
        actionLabel: s.nextContent ? `Buka Part ${s.nextPart}` : "Buka proyek",
        href: s.nextContent ? routes.studio.content(s.nextContent.id) : routes.studio.project(s.project.id),
      };
    case "crosspost":
      return {
        title: RULE_LABELS.crosspost,
        message: `${s.content.title} ${formatRelative(s.relativeScore)}${on}, belum tayang atau terjadwal di ${PLATFORM_LABELS[s.missingPlatform]}.`,
        actionLabel: "Buka konten",
        href: routes.studio.content(s.content.id),
      };
    case "neglected-pillar":
      return {
        title: RULE_LABELS["neglected-pillar"],
        message:
          (s.lastPostedAt
            ? `Belum ada post ${s.pillar.name} dalam ${NEGLECTED_PILLAR_DAYS} hari`
            : `Belum pernah ada post ${s.pillar.name}`) +
          ` (porsi target ${s.pillar.targetShare}%).${plusOthers(s.others, "pilar")}`,
        actionLabel: `Lihat ide ${s.pillar.name}`,
        href: ideasHref(s.pillar.id),
      };
    case "low-ideas":
      return {
        title: RULE_LABELS["low-ideas"],
        message: s.count === 0 ? "Bank ide kosong. Catat beberapa ide baru." : `Bank ide tinggal ${s.count} ide Baru.`,
        actionLabel: "Buka Bank Ide",
        href: routes.studio.ideas,
      };
  }
}

export function describeSuggestion(s: Suggestion): SuggestionView {
  return { key: s.key, rule: s.rule, priority: s.priority, platform: s.platform, ...text(s) };
}

/** Saran sebagai satu baris teks (ringkasan Review dan data AI). */
export function suggestionLine(view: Pick<SuggestionView, "title" | "message">): string {
  return `${view.title}: ${view.message}`;
}
