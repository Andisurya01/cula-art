import { describe, expect, it } from "vitest";
import { formatDiffPercent, formatMetricValue } from "./format";

describe("formatMetricValue", () => {
  it("satuan mengikuti metrik", () => {
    expect(formatMetricValue("SCORE", 150)).toBe("150,0");
    expect(formatMetricValue("ER", 8)).toBe("8,0%");
    expect(formatMetricValue("SAVE_RATE", 1.25)).toBe("1,3%");
    expect(formatMetricValue("SHARE_RATE", 0)).toBe("0,0%");
    expect(formatMetricValue("FOLLOW_RATE", 4)).toBe("4,0");
    expect(formatMetricValue("VIEWS", 12345)).toBe("12.345");
  });

  it("views 0 tampil 0; null/NaN tampil —", () => {
    expect(formatMetricValue("VIEWS", 0)).toBe("0");
    expect(formatMetricValue("SCORE", null)).toBe("—");
    expect(formatMetricValue("ER", Number.NaN)).toBe("—");
  });
});

describe("formatDiffPercent", () => {
  it("bertanda, satu desimal", () => {
    expect(formatDiffPercent(12.46)).toBe("+12,5%");
    expect(formatDiffPercent(-8)).toBe("−8,0%");
    expect(formatDiffPercent(0)).toBe("0,0%");
    expect(formatDiffPercent(-0.04)).toBe("0,0%");
  });

  it("null/tak hingga → —", () => {
    expect(formatDiffPercent(null)).toBe("—");
    expect(formatDiffPercent(undefined)).toBe("—");
    expect(formatDiffPercent(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
