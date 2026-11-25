import { describe, expect, it } from "vitest";
import { themeVariables } from "@/lib/theme/css";
import { defaultThemeTokens } from "@/lib/theme/defaults";
import { TYPE_LEVELS } from "@/lib/theme/schema";
import { previewVariables, previewZoom } from "./editor-preview";

describe("variabel pratinjau", () => {
  it("lebar desktop menimpa ukuran setiap level dengan ukuran desktop tetap (bukan vw)", () => {
    const tokens = defaultThemeTokens();
    const vars = previewVariables(tokens, "dark", "desktop");
    expect(vars["--type-display-size"]).toBe("7rem"); // 112px
    expect(vars["--type-h1-size"]).toBe("4.5rem"); // 72px
    for (const level of TYPE_LEVELS) expect(vars[`--type-${level}-size`]).not.toMatch(/vw/);
    // Selain ukuran judul, sama dengan themeVariables.
    const base = themeVariables(tokens, "dark");
    expect(vars["--background"]).toBe(base["--background"]);
    expect(vars["--type-body-size"]).toBe(base["--type-body-size"]);
  });

  it("zoom kanvas: muat di bingkai, tidak pernah diperbesar", () => {
    expect(previewZoom(640, "desktop")).toBe(0.5);
    expect(previewZoom(343, "mobile")).toBe(0.915);
    expect(previewZoom(2000, "desktop")).toBe(1);
    expect(previewZoom(null, "mobile")).toBe(1);
  });

  it("lebar HP menimpa ukuran setiap level dengan ukuran HP dalam rem", () => {
    const tokens = defaultThemeTokens();
    const vars = previewVariables(tokens, "light", "mobile");
    expect(vars["--type-display-size"]).toBe("3.25rem"); // 52px
    expect(vars["--type-h1-size"]).toBe("2.5rem"); // 40px
    expect(vars["--type-h6-size"]).toBe("0.9375rem"); // 15px
    for (const level of TYPE_LEVELS) {
      expect(vars[`--type-${level}-size`]).not.toMatch(/vw/);
    }
    // Variabel lain tetap sama dengan mode yang dipilih.
    expect(vars["--background"]).toBe(tokens.colors.light.background);
    expect(vars["--type-h1-weight"]).toBe("500");
  });

  it("mode gelap memakai warna gelap", () => {
    const tokens = defaultThemeTokens();
    expect(previewVariables(tokens, "dark", "mobile")["--background"]).toBe(tokens.colors.dark.background);
  });

  it("token tidak valid ditolak (pemanggil wajib memberi versi valid)", () => {
    const tokens = defaultThemeTokens();
    tokens.colors.light.background = "red;}body{color:red";
    expect(() => previewVariables(tokens, "light", "desktop")).toThrow();
  });
});
