// Test statis: Recharts dan src/components/charts hanya boleh dipakai Studio, supaya bundle Galeri
// tetap ringan dan data Studio tidak punya jalan ke halaman publik.

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
const CHART_IMPORT = /from\s+["'](?:recharts|@\/components\/charts[^"']*)["']/;

const publicFiles = [
  ...walk(join(SRC, "app", "(galeri)")),
  ...walk(join(SRC, "features", "gallery")),
  ...walk(join(SRC, "app", "masuk")),
].filter((f) => /\.tsx?$/.test(f));

describe("batas Recharts", () => {
  it("berkas publik ditemukan", () => {
    expect(publicFiles.length).toBeGreaterThanOrEqual(10);
  });

  it("Galeri dan login tidak mengimpor Recharts atau komponen grafik", () => {
    const offenders = publicFiles.filter((f) => CHART_IMPORT.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("Recharts hanya diimpor dari src/components/charts", () => {
    const offenders = walk(SRC)
      .filter((f) => /\.tsx?$/.test(f) && !rel(f).startsWith("src/components/charts/"))
      .filter((f) => /from\s+["']recharts["']/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("Galeri tidak membaca modul metrik", () => {
    const offenders = publicFiles
      .filter((f) => /from\s+["']@\/features\/(?:metrics|analytics|home)[^"']*["']/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
