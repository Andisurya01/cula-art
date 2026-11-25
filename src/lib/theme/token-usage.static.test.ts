// Test statis aturan tampilan (CLAUDE.md, Fase 6): warna, font, ukuran teks, radius, dan durasi di
// komponen hanya lewat token tema. Yang dilarang di src/**/*.ts(x):
// - hex (#RRGGBB/#RGB), oklch(/rgb(/hsl( di kelas atau style;
// - warna bawaan Tailwind (`text-amber-700`, `bg-white`, `from-black/80`, …);
// - ukuran teks, radius, dan durasi arbitrer (`text-[11px]`, `rounded-[6px]`, `duration-200`);
// - easing bawaan (`ease-in-out`) dan font di luar token (`font-serif`, `font-display`).
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
];

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
