// Test statis aturan tampilan (CLAUDE.md, Fase 6): warna, font, ukuran teks, radius, dan durasi di
// komponen hanya lewat token tema. Yang dilarang di src/**/*.ts(x):
// - hex (#RRGGBB/#RGB), oklch(/rgb(/hsl( di kelas atau style;
// - warna bawaan Tailwind (`text-amber-700`, `bg-white`, `from-black/80`, …);
// - ukuran teks, radius, dan durasi arbitrer (`text-[11px]`, `rounded-[6px]`, `duration-200`);
// - easing bawaan (`ease-in-out`) dan font di luar token (`font-serif`, `font-display`);
// - Fase 7: jeda, easing, animasi, dan transisi arbitrer (`delay-150`, `ease-[..]`, `animate-[..]`,
//   `[animation:..]`, `transition-[opacity_200ms]`), `@keyframes` di luar `src/app/globals.css`,
//   transisi properti layout (`transition-all`, `transition-[width]`), `animate-pulse` (pakai Skeleton /
//   `motion-shimmer`), dan durasi ms di string inline (`"transform 200ms ease"`).
// Pengecualian dicatat di ALLOWED beserta alasannya.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const rel = (file: string) => relative(ROOT, file).split(sep).join("/");

/** File/folder yang boleh memuat nilai mentah, dengan alasan. `rules` kosong = semua aturan. */
const ALLOWED: { path: string; reason: string; rules?: string[] }[] = [
  { path: "src/components/charts/", reason: "palet grafik T13 (tervalidasi skill dataviz)" },
  { path: "src/lib/theme/", reason: "nilai default token dan test" },
  {
    path: "src/features/settings/schema.ts",
    reason: "warna default pilar = data pengguna (disimpan di DB), bukan warna tampilan",
    rules: ["hex"],
  },
  {
    path: "src/features/settings/components/pillar-form-dialog.tsx",
    reason: "warna default pilar = data pengguna (disimpan di DB), bukan warna tampilan",
    rules: ["hex"],
  },
];

const isAllowed = (file: string, rule?: string) =>
  ALLOWED.some((a) => rel(file).startsWith(a.path) && (rule === undefined ? !a.rules : !a.rules || a.rules.includes(rule)));

const COLOR_NAMES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const COLOR_UTILS = "text|bg|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|caret|placeholder|accent";

const RULES: { name: string; re: RegExp }[] = [
  { name: "hex", re: /(?<![\w&/])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g },
  { name: "fungsi warna", re: /\b(?:oklch|rgba?|hsla?)\(/g },
  {
    name: "warna Tailwind",
    re: new RegExp(`(?<![\\w-])(?:${COLOR_UTILS})-(?:(?:${COLOR_NAMES})-\\d{2,3}|black|white)(?![\\w-])`, "g"),
  },
  { name: "ukuran teks arbitrer", re: /(?<![\w-])text-\[(?:\d|calc|clamp|min|max)[^\]]*\]/g },
  { name: "radius arbitrer", re: /(?<![\w-])rounded(?:-[a-z]{1,2})?-\[(?!inherit\])[^\]]+\]/g },
  { name: "durasi angka", re: /(?<![\w-])duration-(?:\d+|\[[^\]]+\])(?![\w-])/g },
  { name: "easing bawaan", re: /(?<![\w-])ease-(?:in|out|in-out|linear)(?![\w-])/g },
  { name: "font di luar token", re: /(?<![\w-])font-(?:serif|display)(?![\w-])/g },
  { name: "jeda angka", re: /(?<![\w-])delay-(?:\d+|\[[^\]]+\])(?![\w-])/g },
  { name: "easing arbitrer", re: /(?<![\w-])ease-\[[^\]]+\]/g },
  { name: "animasi arbitrer", re: /(?<![\w-])animate-\[[^\]]+\]|\[animation(?:-[a-z-]+)?:[^\]]+\]/g },
  { name: "transisi berdurasi", re: /(?<![\w-])transition-\[[^\]]*\d+m?s[^\]]*\]/g },
  { name: "keyframes di komponen", re: /@keyframes\b/g },
  // A5: animasi hanya transform/opacity/clip-path, tanpa properti layout.
  {
    name: "transisi properti layout",
    re: /(?<![\w-])transition-(?:all\b|\[[^\]]*\b(?:width|height|top|left|right|bottom|inset|margin|padding)\b[^\]]*\])/g,
  },
  { name: "pulse bawaan", re: /(?<![\w-])animate-pulse(?![\w-])/g },
  { name: "durasi di string", re: /["'`][^"'`]*\b\d+m?s\s+(?:ease|linear|cubic-bezier)/g },
];

/** `@keyframes` hanya di globals.css: file CSS lain di src tidak boleh membuat animasi sendiri. */
const cssFiles = walk(SRC).filter((f) => f.endsWith(".css") && rel(f) !== "src/app/globals.css");

const files = walk(SRC).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !ALLOWED.some((a) => rel(f).startsWith(a.path)),
);

/** Baris komentar dilewati (contoh di dokumentasi tidak dihitung). */
function codeLines(src: string): { line: number; text: string }[] {
  return src
    .split(/\r?\n/)
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => !/^\s*(\/\/|\*|\/\*)/.test(text));
}

describe("Tampilan hanya lewat token tema", () => {
  it("aturan animasi menangkap contoh terlarang dan meloloskan utility token", () => {
    const hits = (text: string) => RULES.filter((r) => new RegExp(r.re.source).test(text)).map((r) => r.name);
    expect(hits("delay-150")).toContain("jeda angka");
    expect(hits("delay-[120ms]")).toContain("jeda angka");
    expect(hits("ease-[cubic-bezier(0,0,1,1)]")).toContain("easing arbitrer");
    expect(hits("animate-[spin_1s_linear]")).toContain("animasi arbitrer");
    expect(hits("[animation-duration:300ms]")).toContain("animasi arbitrer");
    expect(hits("transition-[opacity_200ms]")).toContain("transisi berdurasi");
    expect(hits("@keyframes x {}")).toContain("keyframes di komponen");
    expect(hits("transition-[width]")).toContain("transisi properti layout");
    expect(hits("transition-all")).toContain("transisi properti layout");
    expect(hits("animate-pulse")).toContain("pulse bawaan");
    expect(hits(`transition: "transform 200ms ease"`)).toContain("durasi di string");
    expect(hits("transition-transform transition-[color,scale] transition-colors")).toEqual([]);
    expect(hits("transition-[color,scale] duration-fast ease-standard motion-enter group-hover:motion-zoom")).toEqual([]);
  });

  it("keyframes animasi hanya di src/app/globals.css (durasi dan easing dari token)", () => {
    const offenders = cssFiles.filter((f) => /@keyframes\b/.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("file sumber ditemukan", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("tanpa warna, ukuran teks, radius, durasi, atau font mentah di komponen", () => {
    const violations: string[] = [];
    for (const file of files) {
      for (const { line, text } of codeLines(readFileSync(file, "utf8"))) {
        for (const rule of RULES.filter((r) => !isAllowed(file, r.name))) {
          for (const match of text.matchAll(rule.re)) {
            violations.push(`${rel(file)}:${line} [${rule.name}] ${match[0]}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
    // Membaca ratusan file; saat mesin sibuk bisa lebih dari 5 detik.
  }, 60_000);
});
