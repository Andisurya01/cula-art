"use client";

// Animasi bawaan Recharts mengikuti tingkat animasi (Fase 7, A9). Palet dan bentuk grafik tidak
// berubah; hanya gambar awal / perubahan data yang beranimasi, dengan durasi dan easing dari token.

import { useMemo } from "react";
import type { EasingInput } from "recharts";
import { motionDurationOf, motionEasingOf, useMotionLevel } from "@/components/motion/use-motion-level";
import type { MotionLevel } from "@/lib/theme/schema";

export type ChartAnimation = {
  isAnimationActive: boolean;
  animationDuration: number;
  animationEasing: EasingInput;
};

export const CHART_ANIMATION_OFF: ChartAnimation = {
  isAnimationActive: false,
  animationDuration: 0,
  animationEasing: "ease",
};

/**
 * Nama easing yang bisa datang dari token (`linear`) atau cadangan `motionEasingOf` (`ease`) → kurva
 * CSS-nya. Selalu dikirim sebagai `cubic-bezier(...)` eksplisit: pemetaan nama bawaan Recharts tidak
 * sama persis dengan CSS untuk semua nama.
 */
const NAMED_EASINGS: Record<string, readonly [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
};

const CUBIC_BEZIER = /^cubic-bezier\(\s*([^,\s]+)\s*,\s*([^,\s]+)\s*,\s*([^,\s]+)\s*,\s*([^,\s)]+)\s*\)$/;

/** Easing token (string CSS, mis. `cubic-bezier(0.22, 1, 0.36, 1)`) → easing Recharts. Tidak dikenal → `ease`. */
export function toRechartsEasing(css: string): EasingInput {
  const value = css.trim().toLowerCase();
  const match = CUBIC_BEZIER.exec(value);
  const points = NAMED_EASINGS[value] ?? (match ? match.slice(1, 5).map(Number) : null);
  if (!points || points.length !== 4 || points.some((n) => !Number.isFinite(n))) return "ease";
  const [x1, y1, x2, y2] = points;
  // Titik kendali x di luar 0-1 tidak valid untuk cubic-bezier.
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return "ease";
  return `cubic-bezier(${x1},${y1},${x2},${y2})` as const;
}

/**
 * Animasi grafik per tingkat: Penuh = durasi lambat, Halus = durasi dasar (sama seperti muncul saat
 * di-scroll, `--motion-reveal`), Mati = tanpa animasi. Durasi 0 (gerak dikurangi) juga = tanpa animasi.
 */
export function chartAnimation(
  level: MotionLevel,
  durations: { base: number; slow: number },
  easingCss: string,
): ChartAnimation {
  const duration = level === "full" ? durations.slow : level === "subtle" ? durations.base : 0;
  if (!(duration > 0)) return CHART_ANIMATION_OFF;
  return { isAnimationActive: true, animationDuration: duration, animationEasing: toRechartsEasing(easingCss) };
}

/**
 * Props animasi untuk seri Recharts (`<Line {...animation}>`, `<Bar {...animation}>`). Server dan render
 * hidrasi pertama = Mati (`useMotionLevel`), jadi HTML server sama; token hanya dibaca di browser.
 */
export function useChartAnimation(): ChartAnimation {
  const level = useMotionLevel();
  // Token dibaca sekali per perubahan tingkat (bukan di setiap render setiap grafik).
  return useMemo(
    () =>
      level === "off"
        ? CHART_ANIMATION_OFF
        : chartAnimation(
            level,
            { base: motionDurationOf(null, "base"), slow: motionDurationOf(null, "slow") },
            motionEasingOf(null),
          ),
    [level],
  );
}
