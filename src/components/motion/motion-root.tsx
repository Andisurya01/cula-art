"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MOTION_ATTRIBUTE,
  motionSideForPath,
  REDUCED_MOTION_QUERY,
  resolveMotionLevel,
  type MotionLevels,
} from "@/lib/theme/motion";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Menjaga `<html data-motion>` (A3) setelah skrip awal di <head>: navigasi client antara Galeri dan
 * Studio, tema baru setelah Simpan (`router.refresh()`), dan "kurangi gerakan" yang diubah saat
 * halaman terbuka. `useLayoutEffect` supaya tingkat baru berlaku sebelum halaman berikutnya dilukis.
 */
export function MotionRoot({ gallery, studio }: MotionLevels) {
  const pathname = usePathname();
  // Hanya pemicu effect saat preferensi berubah. Nilainya TIDAK dipakai: saat hidrasi hook memberi
  // snapshot server (false), yang akan menimpa "off" dari skrip awal menjadi tingkat token.
  const reducedChanged = useReducedMotion();

  useLayoutEffect(() => {
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const side = motionSideForPath(pathname);
    const level = resolveMotionLevel(side === "studio" ? studio : gallery, reduced);
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, level);
  }, [pathname, gallery, studio, reducedChanged]);

  return null;
}
