import { AI_FEATURE_LABELS, type AiFeature } from "../features";
import { formatUsd } from "../format";
import type { CheckIssue } from "./checks";

// Laporan markdown set uji (fungsi murni). Ditulis runner ke .ai-evals/ (di-gitignore) untuk dibaca manual.

export type EvalCaseResult = {
  feature: AiFeature;
  caseId: string;
  title: string;
  ok: boolean;
  error?: string;
  /** Model yang menjawab (bisa model fallback). */
  model?: string;
  output?: unknown;
  issues: CheckIssue[];
  costUsd: number;
  durationMs: number;
};

export type EvalReportMeta = {
  startedAt: string;
  model: string;
  guide: "contoh" | "database";
  promptVersions: Record<string, string>;
};

export function summarizeEval(results: readonly EvalCaseResult[]) {
  const errors = results.filter((r) => !r.ok || r.issues.some((i) => i.level === "error")).length;
  return {
    cases: results.length,
    passed: results.length - errors,
    failed: errors,
    warnings: results.reduce((n, r) => n + r.issues.filter((i) => i.level === "warn").length, 0),
    costUsd: results.reduce((sum, r) => sum + r.costUsd, 0),
    avgDurationMs: results.length ? Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length) : 0,
  };
}

export function renderEvalReport(results: readonly EvalCaseResult[], meta: EvalReportMeta): string {
  const total = summarizeEval(results);
  const features = [...new Set(results.map((r) => r.feature))];
  const lines = [
    `# Set uji Asisten AI — ${meta.startedAt}`,
    "",
    `- Model: ${meta.model}`,
    `- Panduan AI: ${meta.guide}`,
    `- Versi prompt: ${features.map((f) => meta.promptVersions[f]).join(", ")}`,
    `- Kasus: ${total.cases}, lolos pemeriksaan otomatis: ${total.passed}, gagal: ${total.failed}, peringatan: ${total.warnings}`,
    `- Biaya: ${formatUsd(total.costUsd)}, rata-rata ${seconds(total.avgDurationMs)} detik per kasus`,
    "",
    "Pemeriksaan otomatis hanya menangkap kesalahan yang jelas. Gaya bahasa dan kegunaan draf dinilai dengan membaca hasil di bawah.",
    "",
    "| Fitur | Kasus | Lolos | Peringatan | Biaya |",
    "| --- | --- | --- | --- | --- |",
    ...features.map((f) => {
      const s = summarizeEval(results.filter((r) => r.feature === f));
      return `| ${AI_FEATURE_LABELS[f]} | ${s.cases} | ${s.passed} | ${s.warnings} | ${formatUsd(s.costUsd)} |`;
    }),
  ];

  for (const feature of features) {
    lines.push("", `## ${AI_FEATURE_LABELS[feature]}`);
    for (const r of results.filter((x) => x.feature === feature)) {
      const status = !r.ok ? "GAGAL" : r.issues.some((i) => i.level === "error") ? "ERROR" : "OK";
      lines.push(
        "",
        `### ${r.caseId} · ${r.title} · ${status}`,
        "",
        `${formatUsd(r.costUsd)} · ${seconds(r.durationMs)} detik${r.model ? ` · ${r.model}` : ""}`,
      );
      if (r.error) lines.push("", `> ${r.error}`);
      for (const issue of r.issues) lines.push(`- ${issue.level === "error" ? "**error**" : "peringatan"}: ${issue.message}`);
      if (r.output !== undefined) lines.push("", "```json", JSON.stringify(r.output, null, 2), "```");
    }
  }
  return `${lines.join("\n")}\n`;
}

function seconds(ms: number): string {
  return (ms / 1000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
