import { describe, expect, it } from "vitest";
import {
  isMotionLevel,
  MOTION_INIT_SCRIPT,
  MOTION_SIDE_ATTRIBUTES,
  motionSideAttributes,
  motionSideForPath,
  resolveMotionLevel,
  type MotionLevels,
} from "./motion";
import { MOTION_LEVELS } from "./schema";

describe("sisi animasi per path", () => {
  it.each([
    ["/", "gallery"],
    ["/karya", "gallery"],
    ["/karya/vas-biru", "gallery"],
    ["/tentang", "gallery"],
    ["/studios", "gallery"],
    ["/masukan", "gallery"],
    ["/studio", "studio"],
    ["/studio/pipeline/abc", "studio"],
    ["/masuk", "studio"],
  ] as const)("%s → %s", (path, side) => {
    expect(motionSideForPath(path)).toBe(side);
  });
});

describe("tingkat akhir: tingkat × kurangi gerakan (A3)", () => {
  for (const level of MOTION_LEVELS) {
    it(`${level} tanpa kurangi gerakan → ${level}`, () => {
      expect(resolveMotionLevel(level, false)).toBe(level);
    });
    it(`${level} + kurangi gerakan → off`, () => {
      expect(resolveMotionLevel(level, true)).toBe("off");
    });
  }

  it("nilai tidak dikenal → off", () => {
    for (const bad of [null, undefined, "", "turbo", "full;}", 1]) {
      expect(resolveMotionLevel(bad, false)).toBe("off");
      expect(isMotionLevel(bad)).toBe(false);
    }
  });

  it("atribut <html> per sisi dari token", () => {
    expect(motionSideAttributes({ gallery: "full", studio: "subtle" })).toEqual({
      "data-motion-gallery": "full",
      "data-motion-studio": "subtle",
    });
  });
});

/** Jalankan skrip awal di "browser" tiruan, lalu kembalikan `data-motion` yang ditulis. */
function runInitScript({
  path,
  levels,
  reduced,
  matchMedia = true,
}: {
  path: string;
  levels: Partial<Record<keyof MotionLevels, string>>;
  reduced: boolean;
  matchMedia?: boolean;
}): string | null {
  const attributes = new Map<string, string>();
  if (levels.gallery !== undefined) attributes.set(MOTION_SIDE_ATTRIBUTES.gallery, levels.gallery);
  if (levels.studio !== undefined) attributes.set(MOTION_SIDE_ATTRIBUTES.studio, levels.studio);
  const documentElement = {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
  };
  const window = matchMedia ? { matchMedia: () => ({ matches: reduced }) } : {};
  new Function("document", "location", "window", MOTION_INIT_SCRIPT)({ documentElement }, { pathname: path }, window);
  return attributes.get("data-motion") ?? null;
}

describe("skrip awal di <head> sama dengan fungsi TS", () => {
  const paths = ["/", "/karya/x", "/studio", "/studio/analitik", "/masuk", "/studiox"];
  for (const path of paths) {
    for (const gallery of MOTION_LEVELS) {
      for (const studio of MOTION_LEVELS) {
        for (const reduced of [false, true]) {
          it(`${path} galeri=${gallery} studio=${studio} kurangi=${reduced}`, () => {
            const side = motionSideForPath(path);
            const expected = resolveMotionLevel(side === "studio" ? studio : gallery, reduced);
            expect(runInitScript({ path, levels: { gallery, studio }, reduced })).toBe(expected);
          });
        }
      }
    }
  }

  it("atribut hilang atau nilai asing → off; tanpa matchMedia tetap jalan", () => {
    expect(runInitScript({ path: "/", levels: {}, reduced: false })).toBe("off");
    expect(runInitScript({ path: "/", levels: { gallery: "turbo" }, reduced: false })).toBe("off");
    expect(runInitScript({ path: "/", levels: { gallery: "full" }, reduced: false, matchMedia: false })).toBe("full");
  });

  it("isi skrip statis: tanpa nilai dari database dan tanpa penutup tag", () => {
    expect(MOTION_INIT_SCRIPT).not.toMatch(/<\/?script/i);
    expect(MOTION_INIT_SCRIPT).toContain('"/studio"');
    expect(MOTION_INIT_SCRIPT).toContain('"/masuk"');
  });
});
