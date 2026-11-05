import { describe, expect, it } from "vitest";
import { renderEvalReport, summarizeEval, type EvalCaseResult } from "./report";

const RESULTS: EvalCaseResult[] = [
  { feature: "hook", caseId: "c01", title: "A", ok: true, model: "claude-opus-5-5", output: { hooks: [] }, issues: [], costUsd: 0.04, durationMs: 4000 },
  {
    feature: "hook",
    caseId: "c02",
    title: "B",
    ok: true,
    output: {},
    issues: [
      { level: "error", message: "Hook kembar" },
      { level: "warn", message: "Terlalu panjang" },
    ],
    costUsd: 0.05,
    durationMs: 6000,
  },
  { feature: "caption", caseId: "c01", title: "C", ok: false, error: "Ditolak", issues: [], costUsd: 0, durationMs: 500 },
];

describe("laporan set uji", () => {
  it("ringkasan: lolos = sukses tanpa error; kosong → nol", () => {
    expect(summarizeEval(RESULTS)).toEqual({ cases: 3, passed: 1, failed: 2, warnings: 1, costUsd: 0.09, avgDurationMs: 3500 });
    expect(summarizeEval([])).toEqual({ cases: 0, passed: 0, failed: 0, warnings: 0, costUsd: 0, avgDurationMs: 0 });
  });

  it("markdown memuat tabel per fitur, status per kasus, dan hasil JSON", () => {
    const md = renderEvalReport(RESULTS, {
      startedAt: "29 Okt 2026 16:00 WIB",
      model: "claude-opus-5-5",
      guide: "contoh",
      promptVersions: { hook: "hook@1+base@1", caption: "caption@1+base@1" },
    });
    expect(md).toContain("- Versi prompt: hook@1+base@1, caption@1+base@1");
    expect(md).toContain("| Hook | 2 | 1 | 1 | US$0,09 |");
    expect(md).toContain("### c02 · B · ERROR");
    expect(md).toContain("- **error**: Hook kembar");
    expect(md).toContain("### c01 · C · GAGAL\n\nUS$0,00 · 0,5 detik\n\n> Ditolak");
    expect(md).toContain('```json\n{\n  "hooks": []\n}\n```');
  });
});
