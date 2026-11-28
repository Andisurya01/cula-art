// Token → CSS (T9, T10). Fungsi murni dan deterministik.
// Keamanan: nama variabel hanya dari konstanta di file ini, nilai hanya dari token yang lolos
// `themeTokensSchema` (hex, angka, enum), lalu setiap nilai dicek sekali lagi dengan pola karakter
// aman. Jadi tidak ada teks bebas (`;`, `{`, `}`, `<`, kutip) yang bisa masuk ke CSS.

import { fontStack } from "./fonts";
import {
  COLOR_KEYS,
  EASINGS,
  themeTokensSchema,
  TYPE_LEVELS,
  type ColorKey,
  type ColorSet,
  type ThemeTokens,
} from "./schema";

/** Lebar layar (px) tempat ukuran HP dan desktop tercapai; di antaranya ukuran berubah mulus. */
export const FLUID_VIEWPORT = { mobile: 375, desktop: 1280 } as const;

/** Variabel CSS per kunci warna. Satu kunci bisa mengisi beberapa variabel (alias Shadcn). */
export const COLOR_VARIABLES: Record<ColorKey, readonly `--${string}`[]> = {
  background: ["--background"],
  surface: ["--card", "--popover"],
  text: ["--foreground", "--card-foreground", "--popover-foreground"],
  textMuted: ["--muted-foreground"],
  border: ["--border"],
  input: ["--input"],
  ring: ["--ring"],
  primary: ["--primary"],
  primaryText: ["--primary-foreground"],
  secondary: ["--secondary", "--muted"],
  secondaryText: ["--secondary-foreground"],
  accent: ["--accent"],
  accentText: ["--accent-foreground"],
  destructive: ["--destructive"],
  success: ["--success"],
  warning: ["--warning"],
  bentoBlue: ["--bento-blue"],
  bentoBlueText: ["--bento-blue-foreground"],
  bentoLime: ["--bento-lime"],
  bentoLimeText: ["--bento-lime-foreground"],
  bentoPurple: ["--bento-purple"],
  bentoPurpleText: ["--bento-purple-foreground"],
  bentoDark: ["--bento-dark"],
  bentoDarkText: ["--bento-dark-foreground"],
  headingSecondary: ["--heading-muted"],
};

const SAFE_NAME = /^--[a-z0-9-]+$/;
const SAFE_VALUE = /^[A-Za-z0-9#.,%()\s+-]+$/;

type Declaration = readonly [name: string, value: string];

/** Angka CSS: maks. 4 desimal, tanpa nol di belakang, tanpa `-0`. */
export function cssNumber(value: number): string {
  const rounded = Math.round(value * 10_000) / 10_000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

const rem = (px: number) => `${cssNumber(px / 16)}rem`;

/**
 * Ukuran yang mengecil mulus dari desktop ke HP: tepat `mobilePx` di lebar 375 px dan `desktopPx`
 * di lebar 1280 px, dibatasi keduanya di luar rentang itu. Dalam rem supaya ikut ukuran huruf browser.
 */
export function fluidSize(mobilePx: number, desktopPx: number): string {
  if (mobilePx === desktopPx) return rem(mobilePx);
  const { mobile, desktop } = FLUID_VIEWPORT;
  const slope = (desktopPx - mobilePx) / (desktop - mobile);
  const interceptPx = mobilePx - slope * mobile;
  const lo = Math.min(mobilePx, desktopPx);
  const hi = Math.max(mobilePx, desktopPx);
  const sign = slope < 0 ? "-" : "+";
  return `clamp(${rem(lo)}, ${rem(interceptPx)} ${sign} ${cssNumber(Math.abs(slope * 100))}vw, ${rem(hi)})`;
}

function colorDeclarations(colors: ColorSet): Declaration[] {
  return COLOR_KEYS.flatMap((key) => COLOR_VARIABLES[key].map((name) => [name, colors[key]] as const));
}

/** Variabel yang sama untuk kedua mode: font, tipografi, bentuk, animasi, warna media. */
function sharedDeclarations(tokens: ThemeTokens): Declaration[] {
  const { typography: type, shape, motion } = tokens;
  const out: Declaration[] = [
    ["--theme-font-heading", fontStack(type.headingFont)],
    ["--theme-font-body", fontStack(type.bodyFont)],
  ];
  for (const level of TYPE_LEVELS) {
    const t = type.levels[level];
    out.push(
      [`--type-${level}-size`, fluidSize(t.sizeMobile, t.sizeDesktop)],
      [`--type-${level}-weight`, String(t.weight)],
      [`--type-${level}-leading`, cssNumber(t.lineHeight)],
      [`--type-${level}-tracking`, `${cssNumber(t.letterSpacing)}em`],
    );
  }
  const body = type.body;
  out.push(
    ["--type-body-lg-size", rem(body.sizeLg)],
    ["--type-body-size", rem(body.sizeBase)],
    ["--type-body-sm-size", rem(body.sizeSm)],
    ["--type-caption-size", rem(body.sizeCaption)],
    ["--type-body-weight", String(body.weight)],
    ["--type-body-leading", cssNumber(body.lineHeight)],
    ["--type-body-tracking", `${cssNumber(body.letterSpacing)}em`],
  );
  const label = type.label;
  out.push(
    ["--type-label-size", rem(label.size)],
    ["--type-label-weight", String(label.weight)],
    ["--type-label-leading", cssNumber(label.lineHeight)],
    ["--type-label-tracking", `${cssNumber(label.letterSpacing)}em`],
    ["--type-label-transform", label.uppercase ? "uppercase" : "none"],
  );
  out.push(
    ["--shape-card", `${shape.card}px`],
    ["--shape-card-nested", `${shape.cardNested}px`],
    ["--shape-button", shape.buttonPill ? "9999px" : `${shape.button}px`],
    ["--shape-input", `${shape.input}px`],
    ["--shape-badge", shape.badgePill ? "9999px" : `${shape.badge}px`],
    ["--shape-image", `${shape.image}px`],
    ["--shape-dialog", `${shape.dialog}px`],
  );
  out.push(
    ["--motion-fast", `${motion.fast}ms`],
    ["--motion-base", `${motion.base}ms`],
    ["--motion-slow", `${motion.slow}ms`],
    ["--motion-ease", EASINGS[motion.easing].css],
    // Fase 7 (A6): jeda antar elemen berurutan dan jarak geser saat muncul. Tingkat per sisi
    // (Mati/Halus/Penuh) tidak ditulis di sini: root layout memasangnya di <html> (lihat motion.ts).
    // Jeda tanpa durasi muncul hanya membuat elemen tersembunyi lalu "meletup": jeda ikut 0.
    ["--motion-stagger", motion.base === 0 && motion.slow === 0 ? "0ms" : `${motion.stagger}ms`],
    ["--motion-distance", `${motion.distance}px`],
  );
  // Latar/teks di atas foto (lightbox, keterangan di foto): selalu palet gelap, di kedua mode.
  out.push(
    ["--media", tokens.colors.dark.background],
    ["--media-foreground", tokens.colors.dark.text],
  );
  return out;
}

function assertSafe(declarations: Declaration[]): Declaration[] {
  for (const [name, value] of declarations) {
    if (!SAFE_NAME.test(name) || !SAFE_VALUE.test(value)) {
      throw new Error(`Nilai tema tidak aman untuk CSS: ${name}`);
    }
  }
  return declarations;
}

function block(selector: string, declarations: Declaration[]): string {
  return `${selector}{${declarations.map(([name, value]) => `${name}:${value}`).join(";")}}`;
}

/**
 * Variabel untuk satu mode sebagai objek `style` React (kontainer pratinjau menu Tampilan).
 * Lempar error jika token tidak lolos schema.
 */
export function themeVariables(tokens: ThemeTokens, mode: "light" | "dark"): Record<string, string> {
  const safe = themeTokensSchema.parse(tokens);
  return Object.fromEntries(
    assertSafe([...sharedDeclarations(safe), ...colorDeclarations(safe.colors[mode])]),
  );
}

/** Nilai animasi saat "kurangi gerakan" aktif (A3): tanpa durasi, jeda, dan jarak geser. */
export const REDUCED_MOTION_DECLARATIONS: readonly Declaration[] = [
  ["--motion-fast", "0ms"],
  ["--motion-base", "0ms"],
  ["--motion-slow", "0ms"],
  ["--motion-stagger", "0ms"],
  ["--motion-distance", "0px"],
];

/**
 * CSS lengkap untuk `<style>` di root layout: `:root` (terang + variabel bersama), `.dark`, dan
 * animasi nol untuk `prefers-reduced-motion`. Lempar error jika token tidak lolos schema.
 */
export function buildThemeCss(tokens: ThemeTokens): string {
  const safe = themeTokensSchema.parse(tokens);
  const root = assertSafe([...sharedDeclarations(safe), ...colorDeclarations(safe.colors.light)]);
  const dark = assertSafe(colorDeclarations(safe.colors.dark));
  const reduced = [...REDUCED_MOTION_DECLARATIONS];
  return [
    block(":root", root),
    block(".dark", dark),
    `@media (prefers-reduced-motion:reduce){${block(":root", reduced)}}`,
  ].join("\n");
}
