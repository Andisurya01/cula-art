import { describe, expect, it } from "vitest";
import { DECIDING_METRICS, EXPERIMENT_VARIABLES } from "@/lib/analytics/experiments";
import {
  concludeExperimentSchema,
  DECIDING_METRIC_LABELS,
  decidingMetricLabel,
  EXPERIMENT_RESULT_LABELS,
  EXPERIMENT_RESULTS,
  EXPERIMENT_VARIABLE_LABELS,
  experimentSchema,
  parseExperimentStatusFilter,
  removeExperimentPostSchema,
  setExperimentPostSchema,
  updateExperimentSchema,
} from "./schema";

const valid = {
  hypothesis: "  Hook hasil jadi menaikkan save rate  ",
  platform: "TIKTOK",
  variable: "HOOK",
  variantA: " Hook proses ",
  variantB: "Hook hasil jadi",
  decidingMetric: "SAVE_RATE",
};

describe("experimentSchema", () => {
  it("menerima isian lengkap dan merapikan spasi", () => {
    const parsed = experimentSchema.parse(valid);
    expect(parsed.hypothesis).toBe("Hook hasil jadi menaikkan save rate");
    expect(parsed.variantA).toBe("Hook proses");
  });

  it("semua variabel dan metrik dari lib/analytics diterima", () => {
    for (const variable of EXPERIMENT_VARIABLES) {
      expect(experimentSchema.safeParse({ ...valid, variable }).success).toBe(true);
    }
    for (const decidingMetric of DECIDING_METRICS) {
      expect(experimentSchema.safeParse({ ...valid, decidingMetric }).success).toBe(true);
    }
  });

  it("menolak field kosong, nilai di luar daftar, dan teks terlalu panjang", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ hypothesis: "   " }, "hypothesis"],
      [{ hypothesis: "x".repeat(301) }, "hypothesis"],
      [{ platform: "YOUTUBE" }, "platform"],
      [{ platform: undefined }, "platform"],
      [{ variable: "CAPTION" }, "variable"],
      [{ variantA: "" }, "variantA"],
      [{ variantB: "x".repeat(201) }, "variantB"],
      [{ decidingMetric: "LIKES" }, "decidingMetric"],
    ];
    for (const [patch, path] of cases) {
      const result = experimentSchema.safeParse({ ...valid, ...patch });
      expect(result.success, JSON.stringify(patch)).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual([path]);
    }
  });

  it("varian A dan B harus berbeda (tanpa beda huruf besar/kecil)", () => {
    const result = experimentSchema.safeParse({ ...valid, variantA: "Hook Hasil Jadi", variantB: "hook hasil jadi " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["variantB"], message: "Varian A dan B harus berbeda" });
  });

  it("update butuh id dan aturan yang sama", () => {
    expect(updateExperimentSchema.safeParse({ ...valid, id: "e1" }).success).toBe(true);
    expect(updateExperimentSchema.safeParse(valid).success).toBe(false);
    expect(updateExperimentSchema.safeParse({ ...valid, id: "e1", variantB: valid.variantA }).success).toBe(false);
  });
});

describe("schema post dan kesimpulan", () => {
  it("varian hanya A atau B", () => {
    expect(setExperimentPostSchema.safeParse({ experimentId: "e", postId: "p", variant: "A" }).success).toBe(true);
    expect(setExperimentPostSchema.safeParse({ experimentId: "e", postId: "p", variant: "C" }).success).toBe(false);
    expect(setExperimentPostSchema.safeParse({ experimentId: "", postId: "p", variant: "B" }).success).toBe(false);
    expect(removeExperimentPostSchema.safeParse({ experimentId: "e", postId: "" }).success).toBe(false);
  });

  it("kesimpulan: hasil dari daftar, catatan opsional maks. 2000", () => {
    expect(concludeExperimentSchema.parse({ id: "e", result: "SUPPORTED", notes: "  " }).notes).toBe("");
    expect(concludeExperimentSchema.safeParse({ id: "e", result: "MAYBE", notes: "" }).success).toBe(false);
    expect(concludeExperimentSchema.safeParse({ id: "e", notes: "" }).success).toBe(false);
    expect(concludeExperimentSchema.safeParse({ id: "e", result: "REJECTED", notes: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
});

describe("label", () => {
  it("setiap variabel, metrik, dan hasil punya label Indonesia", () => {
    expect(EXPERIMENT_VARIABLES.map((v) => EXPERIMENT_VARIABLE_LABELS[v])).toEqual([
      "Hook",
      "Format",
      "Jam posting",
      "Durasi",
      "Cover",
      "Lainnya",
    ]);
    expect(DECIDING_METRICS.every((m) => DECIDING_METRIC_LABELS[m].length > 0)).toBe(true);
    expect(EXPERIMENT_RESULTS.map((r) => EXPERIMENT_RESULT_LABELS[r])).toEqual([
      "Terbukti",
      "Tidak terbukti",
      "Belum jelas",
    ]);
  });

  it("label views mengikuti platform", () => {
    expect(decidingMetricLabel("VIEWS", "TIKTOK")).toBe("Views");
    expect(decidingMetricLabel("VIEWS", "INSTAGRAM")).toBe("Reach");
    expect(decidingMetricLabel("VIEWS")).toBe("Views/Reach");
    expect(decidingMetricLabel("SAVE_RATE", "INSTAGRAM")).toBe("Save rate");
  });
});

describe("parseExperimentStatusFilter", () => {
  it("hanya berjalan/selesai; selain itu semua", () => {
    expect(parseExperimentStatusFilter("berjalan")).toBe("berjalan");
    expect(parseExperimentStatusFilter(["selesai", "berjalan"])).toBe("selesai");
    expect(parseExperimentStatusFilter("SELESAI")).toBeNull();
    expect(parseExperimentStatusFilter(undefined)).toBeNull();
    expect(parseExperimentStatusFilter([])).toBeNull();
  });
});
