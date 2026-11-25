// Test statis: instance next/font di fonts.ts sama dengan daftar terkurasi src/lib/theme/fonts.ts,
// dan hanya font default (judul, isi, mono) yang di-preload (T2).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultThemeTokens } from "@/lib/theme/defaults";
import { FONT_IDS, FONT_OPTIONS } from "@/lib/theme/fonts";

const src = readFileSync(join(__dirname, "fonts.ts"), "utf8");

/** `variable: "--font-x"` + `preload: true|false` per pemanggilan next/font. */
const calls = [...src.matchAll(/\(\{([^)]*?)\}\)/g)].map((m) => ({
  variable: /variable: "([^"]+)"/.exec(m[1])?.[1],
  preload: /preload: (true|false)/.exec(m[1])?.[1] === "true",
}));

describe("font next/font", () => {
  it("setiap font terkurasi punya instance dengan variabel yang sama", () => {
    const variables = calls.map((c) => c.variable);
    for (const id of FONT_IDS) expect(variables, id).toContain(FONT_OPTIONS[id].cssVariable);
    expect(variables).toContain("--font-geist-mono");
    expect(calls).toHaveLength(FONT_IDS.length + 1);
  });

  it("hanya font default yang di-preload", () => {
    const theme = defaultThemeTokens();
    const expected = new Set([
      FONT_OPTIONS[theme.typography.headingFont].cssVariable,
      FONT_OPTIONS[theme.typography.bodyFont].cssVariable,
      "--font-geist-mono",
    ]);
    const preloaded = calls.filter((c) => c.preload).map((c) => c.variable);
    expect(new Set(preloaded)).toEqual(expected);
  });

  it("semua instance memakai display swap dan subset latin", () => {
    expect(src.match(/display: "swap"/g)).toHaveLength(calls.length);
    expect(src.match(/subsets: \["latin"\]/g)).toHaveLength(calls.length);
  });
});
