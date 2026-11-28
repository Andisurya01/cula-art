// Tingkat animasi akhir (Fase 7, A2 + A3). Fungsi murni, tanpa React/Next, dipakai server (root
// layout), client (`MotionRoot`), dan test.
//
// Satu sumber untuk CSS dan test: `<html data-motion="off|subtle|full">`.
// - Server menulis tingkat per sisi dari token: `data-motion-gallery` dan `data-motion-studio`.
// - Skrip kecil di <head> (`MOTION_INIT_SCRIPT`) memilih sisi dari path dan menurunkan ke "off" bila
//   perangkat meminta "kurangi gerakan", SEBELUM isi halaman dilukis (tanpa kedip).
// - `MotionRoot` (client) menjaga nilai itu saat navigasi client dan saat preferensi berubah.
// Tanpa JavaScript, `data-motion` tidak ada: semua animasi diam dan isi terlihat (A4).

import { routes } from "@/lib/routes";
import { MOTION_LEVELS, type MotionLevel } from "./schema";

export type MotionSide = "gallery" | "studio";
export type MotionLevels = Record<MotionSide, MotionLevel>;

/** Atribut di <html>. `data-motion` = tingkat akhir; dua lainnya = tingkat dari token per sisi. */
export const MOTION_ATTRIBUTE = "data-motion";
export const MOTION_SIDE_ATTRIBUTES: Record<MotionSide, string> = {
  gallery: "data-motion-gallery",
  studio: "data-motion-studio",
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Awalan path yang termasuk sisi Studio (login Studio ikut gaya Studio). */
const STUDIO_PREFIXES = [routes.studio.home, routes.login] as const;

const matchesPrefix = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Sisi situs untuk sebuah path: `/studio…` dan `/masuk` = Studio, selain itu Galeri. */
export function motionSideForPath(pathname: string): MotionSide {
  return STUDIO_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ? "studio" : "gallery";
}

export function isMotionLevel(value: unknown): value is MotionLevel {
  return typeof value === "string" && (MOTION_LEVELS as readonly string[]).includes(value);
}

/** Tingkat akhir: "kurangi gerakan" selalu menang (A3); nilai tak dikenal dianggap Mati. */
export function resolveMotionLevel(level: unknown, reducedMotion: boolean): MotionLevel {
  if (reducedMotion || !isMotionLevel(level)) return "off";
  return level;
}

/** Atribut <html> dari token (server). */
export function motionSideAttributes(levels: MotionLevels): Record<string, MotionLevel> {
  return {
    [MOTION_SIDE_ATTRIBUTES.gallery]: levels.gallery,
    [MOTION_SIDE_ATTRIBUTES.studio]: levels.studio,
  };
}

/**
 * Skrip awal di <head>: sama dengan `motionSideForPath` + `resolveMotionLevel`, ditulis ES5 tanpa
 * dependensi. Isinya statis (hanya konstanta di file ini), jadi tidak ada nilai dari database yang
 * masuk ke skrip. Gagal diam-diam: tanpa `data-motion`, halaman tetap utuh tanpa animasi.
 */
export const MOTION_INIT_SCRIPT = `(function(){try{var d=document.documentElement,p=location.pathname,s=${JSON.stringify(
  STUDIO_PREFIXES,
)},side="gallery";for(var i=0;i<s.length;i++){if(p===s[i]||p.indexOf(s[i]+"/")===0){side="studio";break}}var l=d.getAttribute(side==="studio"?${JSON.stringify(
  MOTION_SIDE_ATTRIBUTES.studio,
)}:${JSON.stringify(MOTION_SIDE_ATTRIBUTES.gallery)}),ok=${JSON.stringify(
  MOTION_LEVELS,
)};if(ok.indexOf(l)<0||(window.matchMedia&&window.matchMedia(${JSON.stringify(
  REDUCED_MOTION_QUERY,
)}).matches))l="off";d.setAttribute(${JSON.stringify(MOTION_ATTRIBUTE)},l)}catch(e){}})();`;
