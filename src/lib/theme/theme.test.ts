import { describe, expect, it } from "vitest";
import {
  checkContrast,
  contrastRatio,
  formatRatio,
  headingSecondaryMinimum,
  mixHex,
  relativeLuminance,
} from "./contrast";
import { buildThemeCss, cssNumber, fluidSize, FLUID_VIEWPORT, themeVariables } from "./css";
import {
  applyPreset,
  canonicalJson,
  defaultThemeTokens,
  matchingPreset,
  PRESET_IDS,
  THEME_PRESETS,
  themeTokensEqual,
} from "./defaults";
import { FONT_IDS, FONT_OPTIONS, fontStack } from "./fonts";
import { COLOR_GROUPS, COLOR_LABELS } from "./meta";
import {
  COLOR_KEYS,
  MOTION_V2_DEFAULTS,
  parseThemeTokens,
  THEME_VERSION,
  themeTokensSchema,
  upgradeThemeTokens,
  type ThemeTokens,
} from "./schema";

const clone = () => defaultThemeTokens();

/** Token tanpa tipe, untuk menyusupkan nilai yang ditolak schema (sengaja longgar). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload jahat sengaja melewati tipe
type Untyped = Record<string, any>;

/** Ambil nilai px dari `clamp(lo, a rem ± b vw, hi)` pada lebar layar tertentu (1rem = 16px). */
function evaluateFluid(css: string, viewport: number): number {
  const single = css.match(/^([\d.]+)rem$/);
  if (single) return Number(single[1]) * 16;
  const m = css.match(/^clamp\(([\d.]+)rem, (-?[\d.]+)rem ([+-]) ([\d.]+)vw, ([\d.]+)rem\)$/);
  if (!m) throw new Error(`format clamp tidak dikenal: ${css}`);
  const [lo, intercept, sign, vw, hi] = [Number(m[1]) * 16, Number(m[2]) * 16, m[3], Number(m[4]), Number(m[5]) * 16];
  const preferred = intercept + (sign === "-" ? -1 : 1) * (vw / 100) * viewport;
  return Math.min(hi, Math.max(lo, preferred));
}

describe("schema token tema", () => {
  it("default dan semua preset lolos schema", () => {
    expect(themeTokensSchema.safeParse(clone()).success).toBe(true);
    for (const id of PRESET_IDS) {
      expect(themeTokensSchema.safeParse(THEME_PRESETS[id].tokens).success, id).toBe(true);
    }
  });

  it("hex dinormalisasi ke huruf besar", () => {
    const t = clone();
    t.colors.light.primary = "#abcdef";
    expect(themeTokensSchema.parse(t).colors.light.primary).toBe("#ABCDEF");
  });

  const malicious: [string, (t: Untyped) => void][] = [
    ["warna dengan CSS tambahan", (t) => (t.colors.light.primary = "red;}body{display:none")],
    ["warna penutup style", (t) => (t.colors.dark.background = "#000000</style><script>alert(1)</script>")],
    ["warna 3 digit", (t) => (t.colors.light.text = "#fff")],
    ["warna dengan alpha", (t) => (t.colors.light.text = "#FFFFFF80")],
    ["nama warna", (t) => (t.colors.light.text = "white")],
    ["kunci warna asing", (t) => (t.colors.light["--x"] = "#FFFFFF")],
    ["kunci tingkat atas asing", (t) => (t.css = "body{}")],
    ["font di luar daftar", (t) => (t.typography.headingFont = "Comic Sans; } * {")],
    ["easing teks bebas", (t) => (t.motion.easing = "cubic-bezier(0,0,1,1);}body{")],
    ["ukuran berupa string", (t) => (t.typography.levels.h1.sizeDesktop = "72px;}")],
    ["ukuran di luar rentang", (t) => (t.typography.levels.h1.sizeDesktop = 5000)],
    ["ukuran pecahan", (t) => (t.typography.levels.h1.sizeDesktop = 72.5)],
    ["ketebalan aneh", (t) => (t.typography.levels.h1.weight = 450)],
    ["radius negatif", (t) => (t.shape.card = -4)],
    ["radius NaN", (t) => (t.shape.card = Number.NaN)],
    ["radius Infinity", (t) => (t.shape.card = Number.POSITIVE_INFINITY)],
    ["durasi string", (t) => (t.motion.fast = "150ms")],
    ["mode asing", (t) => (t.defaultMode = "auto")],
    ["versi lain", (t) => (t.version = 3)],
    ["tingkat animasi asing", (t) => (t.motion.gallery = "turbo")],
    ["tingkat animasi berupa CSS", (t) => (t.motion.studio = "full;}body{")],
    ["jeda negatif", (t) => (t.motion.stagger = -10)],
    ["jeda di luar rentang", (t) => (t.motion.stagger = 5000)],
    ["jarak pecahan", (t) => (t.motion.distance = 12.5)],
    ["jarak berupa string", (t) => (t.motion.distance = "24px")],
    ["kunci animasi asing", (t) => (t.motion.keyframes = "@keyframes x{}")],
    ["huruf kapital bukan boolean", (t) => (t.typography.label.uppercase = "uppercase")],
  ];

  for (const [name, mutate] of malicious) {
    it(`menolak payload jahat: ${name}`, () => {
      const t = clone() as unknown as Untyped;
      mutate(t);
      expect(themeTokensSchema.safeParse(t).success).toBe(false);
      expect(parseThemeTokens(JSON.stringify(t))).toBeNull();
    });
  }

  it("parseThemeTokens: JSON rusak dan bukan objek → null", () => {
    expect(parseThemeTokens("{bukan json")).toBeNull();
    expect(parseThemeTokens("null")).toBeNull();
    expect(parseThemeTokens(42)).toBeNull();
    expect(parseThemeTokens(JSON.stringify(clone()))).toEqual(clone());
  });

  it("v1 → v2: kunci animasi baru diisi default, nilai lama dipertahankan", () => {
    const v1 = clone() as unknown as Untyped;
    v1.version = 1;
    v1.motion = { fast: 100, base: 200, slow: 300, easing: "linear" };
    const parsed = parseThemeTokens(JSON.stringify(v1));
    expect(parsed?.version).toBe(THEME_VERSION);
    expect(parsed?.motion).toEqual({ fast: 100, base: 200, slow: 300, easing: "linear", ...MOTION_V2_DEFAULTS });
    expect(parsed?.colors).toEqual(clone().colors);
  });

  it("v1 dengan nilai jahat tetap ditolak setelah dinaikkan; v2 tidak diubah", () => {
    const v1 = clone() as unknown as Untyped;
    v1.version = 1;
    v1.motion = { fast: 100, base: 200, slow: 300, easing: "cubic-bezier(0,0,1,1);}" };
    expect(parseThemeTokens(v1)).toBeNull();
    const v1Extra = clone() as unknown as Untyped;
    v1Extra.version = 1;
    v1Extra.motion = { fast: 100, base: 200, slow: 300, easing: "smooth", gallery: "turbo" };
    expect(parseThemeTokens(v1Extra)).toBeNull();
    const v2 = clone();
    expect(upgradeThemeTokens(v2)).toBe(v2);
    expect(upgradeThemeTokens("bukan objek")).toBe("bukan objek");
    expect(upgradeThemeTokens(null)).toBeNull();
  });

  it("v1 tanpa animasi (semua durasi 0) → tingkat Mati di kedua sisi", () => {
    const v1 = clone() as unknown as Untyped;
    v1.version = 1;
    v1.motion = { fast: 0, base: 0, slow: 0, easing: "smooth" };
    expect(parseThemeTokens(v1)?.motion).toMatchObject({ gallery: "off", studio: "off", stagger: 70 });
  });

  it("jeda ditulis 0 jika durasi sedang dan lambat 0 (tanpa elemen yang meletup)", () => {
    const t = clone();
    t.motion.base = 0;
    t.motion.slow = 0;
    expect(buildThemeCss(t)).toContain("--motion-stagger:0ms");
    t.motion.slow = 300;
    expect(buildThemeCss(t)).toContain("--motion-stagger:70ms");
  });

  it("default animasi: Galeri Penuh, Studio Halus (A2)", () => {
    expect(clone().motion).toMatchObject({ gallery: "full", studio: "subtle" });
    for (const id of PRESET_IDS) expect(THEME_PRESETS[id].tokens.motion.gallery).toBe("full");
  });

  it("setiap kunci warna punya label dan tepat satu grup", () => {
    const grouped = COLOR_GROUPS.flatMap((g) => g.keys);
    expect([...grouped].sort()).toEqual([...COLOR_KEYS].sort());
    for (const key of COLOR_KEYS) expect(COLOR_LABELS[key]).toBeTruthy();
  });
});

describe("CSS dari token", () => {
  it("deterministik: token sama → string sama", () => {
    expect(buildThemeCss(clone())).toBe(buildThemeCss(clone()));
    expect(buildThemeCss(clone())).toMatchSnapshot();
  });

  it("berisi :root, .dark, dan prefers-reduced-motion", () => {
    const css = buildThemeCss(clone());
    expect(css).toContain(":root{");
    expect(css).toContain(".dark{--background:#0B0B0C");
    expect(css).toContain(
      "@media (prefers-reduced-motion:reduce){:root{--motion-fast:0ms;--motion-base:0ms;--motion-slow:0ms;--motion-stagger:0ms;--motion-distance:0px}}",
    );
    expect(css).toContain("--motion-stagger:70ms;--motion-distance:24px");
    expect(css).toContain("--theme-font-heading:var(--font-inter-tight), ui-sans-serif");
    expect(css).toContain("--shape-button:9999px");
    expect(css).toContain("--motion-ease:cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("--type-label-transform:uppercase");
  });

  it("tombol tidak pil → radius px", () => {
    const t = clone();
    t.shape.buttonPill = false;
    t.shape.button = 10;
    expect(buildThemeCss(t)).toContain("--shape-button:10px");
  });

  it("hanya karakter aman yang masuk CSS (tanpa kutip, titik koma di nilai, atau tag)", () => {
    for (const id of PRESET_IDS) {
      const css = buildThemeCss(THEME_PRESETS[id].tokens);
      expect(css).not.toMatch(/[<>"'`\\]/);
      // Setiap deklarasi: --nama:nilai, dipisah ; di dalam satu blok.
      for (const body of css.matchAll(/\{([^{}]*)\}/g)) {
        for (const decl of body[1].split(";")) expect(decl).toMatch(/^--[a-z0-9-]+:[A-Za-z0-9#.,%()\s+-]+$/);
      }
    }
  });

  it("menolak token jahat walau dipaksa lewat tipe (tidak pernah sampai ke CSS)", () => {
    const t = clone() as unknown as Untyped;
    t.colors.light.primary = "red;}body{background:url(x)";
    expect(() => buildThemeCss(t as ThemeTokens)).toThrow();
    expect(() => themeVariables(t as ThemeTokens, "light")).toThrow();
  });

  it("themeVariables: variabel bersama + warna mode yang diminta", () => {
    const light = themeVariables(clone(), "light");
    const dark = themeVariables(clone(), "dark");
    expect(light["--background"]).toBe("#F5F5F3");
    expect(dark["--background"]).toBe("#0B0B0C");
    expect(light["--type-h1-size"]).toBe(dark["--type-h1-size"]);
    // Alias Shadcn ikut terisi.
    expect(light["--popover"]).toBe(light["--card"]);
    expect(light["--muted"]).toBe(light["--secondary"]);
    // Warna media selalu dari palet gelap.
    expect(light["--media"]).toBe("#0B0B0C");
  });

  it("cssNumber: maks. 4 desimal, tanpa -0", () => {
    expect(cssNumber(0.95)).toBe("0.95");
    expect(cssNumber(1 / 3)).toBe("0.3333");
    expect(cssNumber(-0)).toBe("0");
    expect(cssNumber(-0.00001)).toBe("0");
  });
});

describe("clamp() tipografi", () => {
  it("ukuran sama → rem tanpa clamp", () => {
    expect(fluidSize(15, 15)).toBe("0.9375rem");
  });

  it("h1 default: 40 px di 375, 72 px di 1280, dibatasi di luar rentang", () => {
    const css = fluidSize(40, 72);
    expect(css).toBe("clamp(2.5rem, 1.6713rem + 3.5359vw, 4.5rem)");
    expect(evaluateFluid(css, FLUID_VIEWPORT.mobile)).toBeCloseTo(40, 1);
    expect(evaluateFluid(css, FLUID_VIEWPORT.desktop)).toBeCloseTo(72, 1);
    expect(evaluateFluid(css, 320)).toBe(40);
    expect(evaluateFluid(css, 1920)).toBe(72);
    expect(evaluateFluid(css, 827.5)).toBeCloseTo(56, 1);
  });

  it("HP lebih besar dari desktop tetap valid (kemiringan negatif)", () => {
    const css = fluidSize(60, 40);
    expect(css).toMatch(/^clamp\(2\.5rem, [\d.]+rem - [\d.]+vw, 3\.75rem\)$/);
    expect(evaluateFluid(css, 375)).toBeCloseTo(60, 1);
    expect(evaluateFluid(css, 1280)).toBeCloseTo(40, 1);
  });

  it("semua level default lolos format clamp", () => {
    const vars = themeVariables(clone(), "light");
    for (const level of ["display", "h1", "h2", "h3", "h4", "h5", "h6"]) {
      expect(() => evaluateFluid(vars[`--type-${level}-size`], 800)).not.toThrow();
    }
  });
});

describe("kontras WCAG", () => {
  it("pasangan yang diketahui", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("format rasio dibulatkan ke bawah", () => {
    expect(formatRatio(4.4999)).toBe("4,49:1");
    expect(formatRatio(21)).toBe("21,00:1");
  });

  for (const id of PRESET_IDS) {
    for (const mode of ["light", "dark"] as const) {
      it(`semua pasangan ${id} ${mode} lolos T4`, () => {
        const failing = checkContrast(THEME_PRESETS[id].tokens.colors[mode])
          .filter((r) => !r.ok)
          .map((r) => `${r.label} ${r.ratio.toFixed(2)}`);
        expect(failing).toEqual([]);
      });
    }
  }

  it("latar tipis: status dicek di atas campuran 15% (badge/tombol destruktif)", () => {
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#FF0000", "#FFFFFF", 0.15)).toBe("#FFD9D9");
    const t = clone();
    t.colors.light.warning = "#B54708"; // lolos di latar polos (5,4:1), gagal di latar tipis abu
    const results = checkContrast(t.colors.light);
    expect(results.find((r) => r.id === "warning-surface")?.ok).toBe(true);
    expect(results.find((r) => r.id === "warning-tint-secondary")?.ok).toBe(false);
  });

  it("judul baris kedua: 3:1 hanya jika display-h3 selalu teks besar di HP", () => {
    const t = clone();
    expect(headingSecondaryMinimum(t.typography)).toBe(3);
    expect(headingSecondaryMinimum()).toBe(3);
    t.typography.levels.h3.sizeMobile = 20; // 20 px, ketebalan 500: bukan teks besar
    expect(headingSecondaryMinimum(t.typography)).toBe(4.5);
    t.typography.levels.h3.weight = 700; // ≥ 18,66 px tebal: teks besar lagi
    expect(headingSecondaryMinimum(t.typography)).toBe(3);
    t.typography.levels.h3.weight = 500;
    const heading = checkContrast(t.colors.light, t.typography).find((r) => r.id === "heading2-background");
    expect(heading?.min).toBe(4.5);
    expect(heading?.ok).toBe(false); // #8A8A8A di #F5F5F3 = 3,16:1
  });

  it("kontras buruk ditandai", () => {
    const t = clone();
    t.colors.light.textMuted = "#CCCCCC";
    const bad = checkContrast(t.colors.light).filter((r) => !r.ok).map((r) => r.id);
    expect(bad).toContain("muted-background");
  });
});

describe("preset dan reset", () => {
  it("reset = default: salinan baru, sama nilainya, tidak berbagi referensi", () => {
    const a = defaultThemeTokens();
    a.colors.light.primary = "#123456";
    const b = defaultThemeTokens();
    expect(b.colors.light.primary).toBe("#0A0A0A");
    expect(b).toEqual(THEME_PRESETS.monokrom.tokens);
  });

  it("applyPreset mempertahankan mode default", () => {
    const t = clone();
    t.defaultMode = "dark";
    const bento = applyPreset(t, "bento");
    expect(bento.defaultMode).toBe("dark");
    expect(bento.colors.light.accent).toBe(THEME_PRESETS.bento.tokens.colors.light.accent);
    expect(matchingPreset(bento)).toBe("bento");
  });

  it("matchingPreset: diubah → null; urutan kunci dan huruf hex tidak berpengaruh", () => {
    const t = clone();
    expect(matchingPreset(t)).toBe("monokrom");
    t.colors.light.primary = "#0a0a0a";
    expect(matchingPreset(t)).toBe("monokrom");
    t.shape.card = 12;
    expect(matchingPreset(t)).toBeNull();
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(themeTokensEqual(clone(), clone())).toBe(true);
  });
});

describe("font terkurasi", () => {
  it("delapan font T2, variabel unik, stack dengan cadangan", () => {
    expect(FONT_IDS).toHaveLength(8);
    const vars = FONT_IDS.map((id) => FONT_OPTIONS[id].cssVariable);
    expect(new Set(vars).size).toBe(vars.length);
    expect(fontStack("instrument-serif")).toBe("var(--font-instrument-serif), ui-serif, Georgia, serif");
  });
});
