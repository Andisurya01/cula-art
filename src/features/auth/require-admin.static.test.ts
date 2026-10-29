// Test statis: setiap pintu masuk Studio memanggil `await requireAdmin()` sebelum hal lain.
// - setiap `export async function` di src/features/**/actions.ts (Server Action);
// - setiap layout/page/route/generateMetadata di src/app/studio/**.

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

/** Isi body fungsi (setelah `{` pembuka) untuk setiap deklarasi yang cocok. */
function functionBodies(src: string, head: RegExp): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  for (const match of src.matchAll(head)) {
    let i = src.indexOf("(", match.index! + match[0].length - 1);
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) break;
    }
    let angle = 0;
    for (i++; i < src.length; i++) {
      if (src[i] === "<") angle++;
      else if (src[i] === ">" && src[i - 1] !== "=") angle--;
      else if (src[i] === "{" && angle === 0) break;
    }
    out.push({ name: match[1] ?? match[0], body: src.slice(i + 1, i + 400) });
  }
  return out;
}

const GUARD = /^\s*(?:const\s+(?:\w+|\{[^}]*\})\s*=\s*)?await requireAdmin\(\);/;

const actionFiles = walk(join(SRC, "features")).filter((f) => f.endsWith(`${sep}actions.ts`));
const studioFiles = walk(join(SRC, "app", "studio")).filter((f) =>
  /(^|[\\/])(page|layout|route)\.tsx?$/.test(f),
);

describe("Server Action Studio diawali requireAdmin()", () => {
  it("file actions.ts ditemukan", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(7);
  });

  for (const file of actionFiles) {
    const src = readFileSync(file, "utf8");
    const fns = functionBodies(src, /export async function (\w+)/g);
    it(`${rel(file)}: ${fns.length} aksi`, () => {
      expect(src.startsWith('"use server"')).toBe(true);
      const unguarded = fns.filter((fn) => !GUARD.test(fn.body)).map((fn) => fn.name);
      expect(unguarded).toEqual([]);
      // "use server" hanya boleh mengekspor fungsi async (aksi), bukan helper lain.
      expect(src).not.toMatch(/^export (?!async function|type |interface )/m);
    });
  }
});

describe("Halaman, layout, dan Route Handler Studio diawali requireAdmin()", () => {
  it("file Studio ditemukan", () => {
    expect(studioFiles.length).toBeGreaterThanOrEqual(10);
  });

  for (const file of studioFiles) {
    const src = readFileSync(file, "utf8");
    it(rel(file), () => {
      const heads = [
        /export default (?:async )?function (\w+)/g,
        /export async function (generateMetadata)/g,
        /export async function (GET|POST|PUT|PATCH|DELETE)\b/g,
      ];
      const fns = heads.flatMap((re) => functionBodies(src, re));
      expect(fns.length).toBeGreaterThan(0);
      const unguarded = fns.filter((fn) => !GUARD.test(fn.body)).map((fn) => fn.name);
      expect(unguarded).toEqual([]);
    });
  }
});

// ---- Inventaris pintu server lain (celah yang tidak tertangkap pemeriksaan di atas) ----

const allSource = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f));
const USE_SERVER = /^\s*["']use server["'];?\s*$/m;

describe("Inventaris Server Action dan Route Handler", () => {
  it('"use server" hanya di actions.ts (dijaga requireAdmin) dan login-actions.ts (publik)', () => {
    const files = allSource.filter((f) => USE_SERVER.test(readFileSync(f, "utf8"))).map(rel);
    const unexpected = files.filter(
      (f) => !f.endsWith("/actions.ts") && f !== "src/features/auth/login-actions.ts",
    );
    expect(unexpected).toEqual([]);
  });

  it('tidak ada "use server" inline di dalam fungsi/komponen', () => {
    const inline = allSource.filter((f) => {
      const src = readFileSync(f, "utf8");
      const first = src.trimStart().startsWith('"use server"') || src.trimStart().startsWith("'use server'");
      const count = (src.match(/["']use server["']/g) ?? []).length;
      return count > (first ? 1 : 0);
    });
    expect(inline.map(rel)).toEqual([]);
  });

  it("Route Handler di luar Studio hanya yang memang publik", () => {
    const publicRoutes = walk(join(SRC, "app"))
      .filter((f) => /[\\/]route\.tsx?$/.test(f) && !f.includes(`${sep}studio${sep}`))
      .map(rel)
      .sort();
    expect(publicRoutes).toEqual(["src/app/api/health/route.ts", "src/app/media/[...key]/route.ts"]);
  });

  it("Route Handler Studio hanya mengekspor handler sebagai `export async function`", () => {
    for (const file of studioFiles.filter((f) => /route\.tsx?$/.test(f))) {
      const src = readFileSync(file, "utf8");
      expect(src, rel(file)).not.toMatch(/^export\s+(const|let|var)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/m);
      expect(src, rel(file)).not.toMatch(/^export\s*\{/m);
    }
  });

  it("tidak ada loading/template/default di Studio yang bisa merender data tanpa page", () => {
    const extra = walk(join(SRC, "app", "studio")).filter((f) => /[\\/](template|default)\.tsx?$/.test(f));
    expect(extra.map(rel)).toEqual([]);
  });
});
