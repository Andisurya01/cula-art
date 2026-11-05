import { describe, expect, it } from "vitest";
import { formatUsd, idByName } from "./format";

describe("formatUsd", () => {
  it("format Indonesia, sen kecil tetap terlihat", () => {
    expect(formatUsd(0)).toBe("US$0,00");
    expect(formatUsd(0.0432)).toBe("US$0,043");
    expect(formatUsd(0.005)).toBe("US$0,005");
    expect(formatUsd(1.5)).toBe("US$1,50");
    expect(formatUsd(10)).toBe("US$10,00");
  });
});

describe("idByName", () => {
  const items = [
    { id: "a", name: "Proses Clay" },
    { id: "b", name: "Showcase" },
  ];
  it("cocok tanpa peduli huruf besar dan spasi", () => {
    expect(idByName(items, " proses clay ")).toBe("a");
    expect(idByName(items, "Lain")).toBeNull();
    expect(idByName(items, null)).toBeNull();
  });
});
