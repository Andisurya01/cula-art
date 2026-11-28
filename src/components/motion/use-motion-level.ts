"use client";

import { useSyncExternalStore } from "react";
import { isMotionLevel, MOTION_ATTRIBUTE } from "@/lib/theme/motion";
import type { MotionLevel } from "@/lib/theme/schema";
import { parseCssTime } from "./motion-utils";

/**
 * Tingkat animasi untuk sebuah elemen: `data-motion` terdekat (kontainer pratinjau menu Tampilan
 * bisa punya tingkat sendiri), lalu `<html>`. Tanpa atribut (JS belum jalan / tidak dikenal) = Mati.
 */
export function motionLevelOf(element: Element | null): MotionLevel {
  const scope = element?.closest(`[${MOTION_ATTRIBUTE}]`) ?? document.documentElement;
  const value = scope.getAttribute(MOTION_ATTRIBUTE);
  return isMotionLevel(value) ? value : "off";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [MOTION_ATTRIBUTE] });
  return () => observer.disconnect();
}

const getSnapshot = () => motionLevelOf(null);
// Server (dan render hidrasi pertama) = Mati: komponen yang memakai hook ini baru beranimasi setelah
// tahu tingkat sebenarnya, jadi HTML server dan client selalu sama.
const getServerSnapshot = (): MotionLevel => "off";

/**
 * Tingkat animasi halaman saat ini (`<html data-motion>`), ikut berubah saat navigasi antar sisi
 * atau saat "kurangi gerakan" diubah. Untuk logika JS (mis. `isAnimationActive` grafik); efek CSS
 * cukup memakai utility `motion-*` di `globals.css`.
 */
export function useMotionLevel(): MotionLevel {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Durasi token (ms) untuk library yang meminta angka (dnd-kit `dropAnimation`, Recharts
 * `animationDuration`). Dibaca dari elemen (atau <html>), jadi otomatis 0 saat Mati / kurangi gerakan.
 * Hanya di event/effect (butuh DOM).
 */
export function motionDurationOf(element: Element | null, speed: "fast" | "base" | "slow"): number {
  return parseCssTime(getComputedStyle(element ?? document.documentElement).getPropertyValue(`--motion-${speed}`));
}

/** Easing token sebagai string CSS (mis. `cubic-bezier(0.22, 1, 0.36, 1)`); cadangan `ease`. */
export function motionEasingOf(element: Element | null): string {
  return getComputedStyle(element ?? document.documentElement).getPropertyValue("--motion-ease").trim() || "ease";
}
