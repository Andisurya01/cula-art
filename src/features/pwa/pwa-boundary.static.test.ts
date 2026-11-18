// Test statis PWA (E10): service worker hanya untuk Studio, tidak meng-cache HTML/data, tidak butuh login,
// dan halaman offline memakai database antrean yang sama dengan Studio.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFLINE_IDEA_DB, SERVICE_WORKER_SCOPE, SERVICE_WORKER_URL } from "./offline-queue";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
const rel = (file: string) => relative(ROOT, file).split(sep).join("/");
const sources = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f));

describe("pendaftaran service worker", () => {
  it("hanya komponen PWA yang memanggil serviceWorker.register, dan hanya layout Studio yang memasangnya", () => {
    const registering = sources.filter((f) => /serviceWorker\s*\.\s*register\(/.test(readFileSync(f, "utf8"))).map(rel);
    expect(registering).toEqual(["src/features/pwa/components/studio-service-worker.tsx"]);
    const mounting = sources.filter((f) => /StudioServiceWorker/.test(readFileSync(f, "utf8"))).map(rel).sort();
    expect(mounting).toEqual([
      "src/app/studio/(app)/layout.tsx",
      "src/features/pwa/components/studio-service-worker.tsx",
    ]);
  });

  it("Galeri tidak mengimpor modul PWA dan tidak menautkan manifest Studio", () => {
    const gallery = sources.filter((f) => f.includes(`${sep}(galeri)${sep}`) || f.includes(`${sep}features${sep}gallery${sep}`));
    expect(gallery.length).toBeGreaterThan(5);
    for (const file of gallery) {
      const src = readFileSync(file, "utf8");
      expect(src, rel(file)).not.toMatch(/features\/pwa|studio\.webmanifest|serviceWorker/);
    }
    expect(read("src", "app", "layout.tsx")).not.toMatch(/manifest|serviceWorker/);
  });

  it("CSP: Studio mengizinkan worker dan manifest milik sendiri; Galeri melarang worker", () => {
    const config = read("next.config.ts");
    expect(config).toContain("worker-src ${studio ? \"'self'\" : \"'none'\"}");
    expect(config).toContain("manifest-src 'self'");
  });
});

describe("service worker (public/studio-sw.js)", () => {
  const sw = read("public", "studio-sw.js");

  it("file statis di luar /studio (tanpa login lewat proxy), scope Beranda + /studio/*", () => {
    expect(SERVICE_WORKER_URL).toBe("/studio-sw.js");
    expect(SERVICE_WORKER_SCOPE).toBe("/studio");
    const proxy = read("src", "proxy.ts");
    expect(proxy).toContain('matcher: ["/studio", "/studio/((?!');
  });

  it("tidak pernah menyimpan respons navigasi (HTML Studio) ke cache", () => {
    // Cache hanya diisi addAll(PRECACHE); navigasi hanya fetch lalu dikembalikan, tanpa cache.put.
    expect(sw.match(/\.put\(/g)?.length ?? 0).toBe(0);
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toMatch(/const PRECACHE = \[\s*OFFLINE_URL,\s*"\/studio\.webmanifest",/);
    const code = sw.replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\/_next\/|\/media\/|_rsc/);
  });

  it("install mem-precache halaman offline; activate membuang cache versi lama lalu mengambil alih tab", () => {
    expect(sw).toMatch(/addEventListener\("install"[\s\S]*cache\.addAll\(PRECACHE\.map\(reload\)\)[\s\S]*skipWaiting\(\)/);
    expect(sw).toMatch(/addEventListener\("activate"[\s\S]*key !== CACHE[\s\S]*navigationPreload\.enable\(\)[\s\S]*clients\.claim\(\)/);
    expect(sw).toMatch(/addEventListener\("fetch"/);
  });

  it("cache hanya diisi ulang dari navigasi Studio yang berhasil, bukan redirect ke /masuk setelah logout", () => {
    expect(sw).toMatch(/if \(response\.ok && !response\.redirected && response\.type !== "opaqueredirect"\) event\.waitUntil\(ensurePrecache\(\)\)/);
  });

  it("logout menghapus cache lewat pesan clear-cache; IndexedDB tidak disentuh", () => {
    expect(sw).toContain('event.data.type === "clear-cache"');
    expect(sw).not.toContain("indexedDB");
  });
});

describe("halaman offline (public/studio-offline.html)", () => {
  const html = read("public", "studio-offline.html");

  it("memakai database antrean yang sama dengan Studio", () => {
    expect(html).toContain(`var DB_NAME = "${OFFLINE_IDEA_DB.name}";`);
    expect(html).toContain(`var DB_VERSION = ${OFFLINE_IDEA_DB.version};`);
    expect(html).toContain(`var STORE = "${OFFLINE_IDEA_DB.store}";`);
  });

  it("mandiri: tanpa skrip/stylesheet eksternal dan tanpa data", () => {
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
    expect(html).not.toMatch(/fetch\(/);
  });
});

describe("manifest Studio", () => {
  it("scope, start_url, dan ikon Studio", () => {
    const manifest = JSON.parse(read("public", "studio.webmanifest")) as {
      start_url: string;
      scope: string;
      display: string;
      icons: { src: string; sizes: string; purpose: string }[];
    };
    expect(manifest).toMatchObject({ start_url: "/studio", scope: "/studio", display: "standalone" });
    expect(manifest.icons.map((i) => `${i.sizes}:${i.purpose}`)).toEqual(["192x192:any", "512x512:any", "512x512:maskable"]);
    for (const icon of manifest.icons) expect(() => read("public", ...icon.src.split("/").filter(Boolean))).not.toThrow();
  });
});
