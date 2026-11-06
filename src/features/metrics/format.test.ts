import { describe, expect, it } from "vitest";
import {
  axisTickFormatter,
  EMPTY_VALUE,
  formatCompact,
  formatCount,
  formatFollowRate,
  formatPercent,
  formatPerWeek,
  formatRelative,
  formatScore,
  formatSeconds,
  formatSigned,
} from "./format";

describe("axisTickFormatter", () => {
  it("rentang sempit memakai angka penuh, supaya tick tidak kembar", () => {
    expect(axisTickFormatter([1230, 1249])(1240)).toBe("1.240");
    expect(axisTickFormatter([1_200_000, 1_210_000])(1_205_000)).toBe("1.205.000");
    expect(axisTickFormatter([500])(500)).toBe("500");
  });

  it("rentang lebar memakai angka ringkas", () => {
    expect(axisTickFormatter([7700, 12100])(12100)).toBe("12,1 rb");
    expect(axisTickFormatter([1_000_000, 2_000_000])(1_500_000)).toBe("1,5 jt");
  });

  it("data kosong tidak error", () => {
    expect(axisTickFormatter([])(1000)).toBe("1 rb");
  });
});

describe("format metrik", () => {
  it("angka biasa", () => {
    expect(formatCount(12345)).toBe("12.345");
    expect(formatCount(0)).toBe("0");
    expect(formatPercent(8)).toBe("8,0%");
    expect(formatPercent(0)).toBe("0,0%");
    expect(formatScore(150)).toBe("150,0");
    expect(formatRelative(1.5)).toBe("1,50x");
    expect(formatRelative(0)).toBe("0,00x");
    expect(formatFollowRate(4)).toBe("4,0");
    expect(formatSeconds(8.3)).toBe("8,3 dtk");
    expect(formatPerWeek(2.5)).toBe("2,5");
    expect(formatPerWeek(2)).toBe("2");
  });

  it("ringkas", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(12300)).toBe("12,3 rb");
    expect(formatCompact(1000)).toBe("1 rb");
    expect(formatCompact(1200000)).toBe("1,2 jt");
    expect(formatCompact(-12300)).toBe("-12,3 rb");
  });

  it("bertanda", () => {
    expect(formatSigned(1234)).toBe("+1.234");
    expect(formatSigned(-10)).toBe("−10");
    expect(formatSigned(0)).toBe("0");
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])("%s tampil sebagai tanda kosong", (value) => {
    for (const format of [
      formatCount,
      formatCompact,
      formatSigned,
      formatPercent,
      formatScore,
      formatRelative,
      formatFollowRate,
      formatSeconds,
      formatPerWeek,
    ]) {
      expect(format(value)).toBe(EMPTY_VALUE);
    }
  });
});
