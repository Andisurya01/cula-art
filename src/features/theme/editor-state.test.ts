import { describe, expect, it } from "vitest";
import { defaultThemeTokens, matchingPreset, THEME_PRESETS, themeTokensEqual } from "@/lib/theme/defaults";
import { RANGES } from "@/lib/theme/schema";
import {
  countInvalid,
  editorReducer,
  hexFieldError,
  initEditorState,
  isHexColor,
  normalizeHexInput,
  numberFieldError,
  setBody,
  setColor,
  setDefaultMode,
  setFonts,
  setLabel,
  setMotion,
  setShape,
  setTypeLevel,
  validateDraft,
} from "./editor-state";

const base = () => defaultThemeTokens();

describe("pengubah draf", () => {
  it("hanya mengubah cabang yang dituju dan tidak memutasi input", () => {
    const tokens = base();
    const snapshot = structuredClone(tokens);

    const colored = setColor(tokens, "dark", "primary", "#123456");
    expect(colored.colors.dark.primary).toBe("#123456");
    expect(colored.colors.light).toBe(tokens.colors.light);
    expect(colored.typography).toBe(tokens.typography);

    const leveled = setTypeLevel(tokens, "h1", { sizeDesktop: 80 });
    expect(leveled.typography.levels.h1).toEqual({ ...tokens.typography.levels.h1, sizeDesktop: 80 });
    expect(leveled.typography.levels.h2).toBe(tokens.typography.levels.h2);
    expect(leveled.colors).toBe(tokens.colors);

    expect(setBody(tokens, { sizeBase: 17 }).typography.body.sizeBase).toBe(17);
    expect(setLabel(tokens, { uppercase: false }).typography.label.uppercase).toBe(false);
    expect(setFonts(tokens, { headingFont: "manrope" }).typography.headingFont).toBe("manrope");
    expect(setShape(tokens, { card: 12, buttonPill: false }).shape).toMatchObject({ card: 12, buttonPill: false });
    expect(setMotion(tokens, { easing: "linear" }).motion.easing).toBe("linear");
    expect(setDefaultMode(tokens, "dark").defaultMode).toBe("dark");

    expect(tokens).toEqual(snapshot);
  });
});

describe("validasi draf", () => {
  it("draf valid: token hasil parse (hex huruf besar), tanpa path tidak valid", () => {
    const result = validateDraft(setColor(base(), "light", "accent", "#abcdef"));
    expect(result.tokens?.colors.light.accent).toBe("#ABCDEF");
    expect(result.invalidPaths.size).toBe(0);
  });

  it("draf tidak valid: path per isian", () => {
    let draft = setColor(base(), "dark", "background", "#12");
    draft = setTypeLevel(draft, "h1", { sizeDesktop: Number.NaN });
    draft = setShape(draft, { card: 999 });
    const result = validateDraft(draft);
    expect(result.tokens).toBeNull();
    expect([...result.invalidPaths].sort()).toEqual([
      "colors.dark.background",
      "shape.card",
      "typography.levels.h1.sizeDesktop",
    ]);
    expect(countInvalid(result.invalidPaths, "colors")).toBe(1);
    expect(countInvalid(result.invalidPaths, "colors.light")).toBe(0);
    expect(countInvalid(result.invalidPaths, "typography")).toBe(1);
    expect(countInvalid(result.invalidPaths, "shape")).toBe(1);
    // Awalan harus per segmen: "shape" tidak cocok dengan "shapeX".
    expect(countInvalid(new Set(["shapeX.card"]), "shape")).toBe(0);
  });
});

describe("input hex", () => {
  it("nilai lengkap dinormalkan, teks setengah jadi dibiarkan", () => {
    expect(normalizeHexInput("1463ff")).toBe("#1463FF");
    expect(normalizeHexInput("  #c6f432 ")).toBe("#C6F432");
    expect(normalizeHexInput("#14")).toBe("#14");
    expect(normalizeHexInput("red;}body{")).toBe("red;}body{");
    expect(normalizeHexInput("")).toBe("");
  });

  it("validasi dan pesan", () => {
    expect(isHexColor("#AbCdEf")).toBe(true);
    expect(isHexColor("#ABC")).toBe(false);
    expect(hexFieldError("#ABCDEF")).toBeNull();
    expect(hexFieldError("")).toBe("Wajib diisi.");
    expect(hexFieldError("#XYZXYZ")).toMatch(/#RRGGBB/);
  });
});

describe("pesan isian angka", () => {
  it("kosong, di luar rentang, bukan bulat", () => {
    expect(numberFieldError(Number.NaN, RANGES.radius)).toBe("Wajib diisi.");
    expect(numberFieldError(65, RANGES.radius, { integer: true })).toBe("Isi antara 0 dan 64.");
    expect(numberFieldError(2.5, RANGES.lineHeight)).toBe("Isi antara 0,8 dan 2.");
    expect(numberFieldError(12.5, RANGES.radius, { integer: true })).toBe("Harus bilangan bulat.");
    expect(numberFieldError(1.05, RANGES.lineHeight)).toBeNull();
    expect(numberFieldError(0, RANGES.radius, { integer: true })).toBeNull();
  });
});

describe("reducer editor", () => {
  it("edit valid memperbarui pratinjau; edit tidak valid mempertahankan pratinjau valid terakhir", () => {
    const start = initEditorState(base(), false);
    const valid = editorReducer(start, { type: "edit", recipe: (d) => setColor(d, "light", "primary", "#222222") });
    expect(valid.draft.colors.light.primary).toBe("#222222");
    expect(valid.preview.colors.light.primary).toBe("#222222");

    const invalid = editorReducer(valid, { type: "edit", recipe: (d) => setColor(d, "light", "primary", "#22") });
    expect(invalid.draft.colors.light.primary).toBe("#22");
    expect(invalid.preview).toBe(valid.preview);
    expect(invalid.saved).toBe(start.saved);
  });

  it("preset mengisi semua nilai tetapi mempertahankan mode default", () => {
    const start = initEditorState(setDefaultMode(base(), "dark"), true);
    const next = editorReducer(start, { type: "preset", preset: "bento" });
    expect(next.draft.defaultMode).toBe("dark");
    expect(matchingPreset(next.draft)).toBe("bento");
    expect(next.preview).toEqual(next.draft);
    expect(next.customized).toBe(true);
  });

  it("batalkan kembali ke versi tersimpan", () => {
    const start = initEditorState(base(), true);
    const edited = editorReducer(start, { type: "edit", recipe: (d) => setShape(d, { card: Number.NaN }) });
    const discarded = editorReducer(edited, { type: "discard" });
    expect(themeTokensEqual(discarded.draft, start.saved)).toBe(true);
    expect(discarded.preview).toBe(start.saved);
  });

  it("simpan dan reset mengganti versi tersimpan serta status kustom", () => {
    const start = initEditorState(base(), false);
    const bento = structuredClone(THEME_PRESETS.bento.tokens);
    const saved = editorReducer(start, { type: "saved", tokens: bento });
    expect(saved).toEqual({ saved: bento, draft: bento, preview: bento, customized: true });

    const reset = editorReducer(saved, { type: "reset", tokens: base() });
    expect(reset.customized).toBe(false);
    expect(themeTokensEqual(reset.saved, base())).toBe(true);
    expect(reset.draft).toBe(reset.saved);
  });
});
