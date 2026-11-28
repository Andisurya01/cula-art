import { describe, expect, it } from "vitest";
import { EASINGS } from "@/lib/theme/schema";
import { CHART_ANIMATION_OFF, chartAnimation, toRechartsEasing } from "./chart-motion";

describe("toRechartsEasing", () => {
  it("meneruskan setiap easing token sebagai cubic-bezier yang dikenal Recharts", () => {
    for (const { css } of Object.values(EASINGS)) {
      expect(toRechartsEasing(css)).toMatch(/^cubic-bezier\(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+\)$/);
    }
    expect(toRechartsEasing("cubic-bezier(0.22, 1, 0.36, 1)")).toBe("cubic-bezier(0.22,1,0.36,1)");
    expect(toRechartsEasing(" cubic-bezier(0.2,0,0,1) ")).toBe("cubic-bezier(0.2,0,0,1)");
  });

  it("nama dari token / cadangan dipetakan ke kurva CSS aslinya", () => {
    expect(toRechartsEasing("linear")).toBe("cubic-bezier(0,0,1,1)");
    expect(toRechartsEasing("ease")).toBe("cubic-bezier(0.25,0.1,0.25,1)");
  });

  it("nilai tidak dikenal atau tidak valid → ease", () => {
    expect(toRechartsEasing("")).toBe("ease");
    expect(toRechartsEasing("steps(4)")).toBe("ease");
    expect(toRechartsEasing("cubic-bezier(1, 2, 3)")).toBe("ease");
    expect(toRechartsEasing("cubic-bezier(1.5, 0, 0.2, 1)")).toBe("ease");
    expect(toRechartsEasing("cubic-bezier(a, 0, 0.2, 1)")).toBe("ease");
  });
});

describe("chartAnimation", () => {
  const durations = { base: 250, slow: 450 };
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

  it("Mati = tanpa animasi", () => {
    expect(chartAnimation("off", durations, easing)).toEqual(CHART_ANIMATION_OFF);
  });

  it("Halus = durasi dasar, Penuh = durasi lambat, easing dari token", () => {
    expect(chartAnimation("subtle", durations, easing)).toEqual({
      isAnimationActive: true,
      animationDuration: 250,
      animationEasing: "cubic-bezier(0.22,1,0.36,1)",
    });
    expect(chartAnimation("full", durations, easing).animationDuration).toBe(450);
  });

  it("durasi 0 (gerak dikurangi) atau tidak valid = tanpa animasi", () => {
    expect(chartAnimation("full", { base: 0, slow: 0 }, easing)).toEqual(CHART_ANIMATION_OFF);
    expect(chartAnimation("subtle", { base: Number.NaN, slow: 450 }, easing)).toEqual(CHART_ANIMATION_OFF);
  });
});
