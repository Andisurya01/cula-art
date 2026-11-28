"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { countUpDuration, countUpValue, formatCount, parseCssTime } from "./motion-utils";
import { motionLevelOf } from "./use-motion-level";

/**
 * Angka yang menghitung naik sekali saat terlihat (Fase 7, A4). Nilai akhir SELALU ada di HTML
 * server (SEO, tanpa JS, pembaca layar); hitung naik hanya efek di atasnya:
 * - lebar dipesan dengan salinan tak terlihat dari nilai akhir (tanpa layout shift);
 * - pembaca layar hanya membaca nilai akhir (salinan `sr-only`), bukan angka yang berubah;
 * - Mati / "kurangi gerakan" / nilai 0 → tidak beranimasi;
 * - hanya sekali per pemasangan: nilai yang berubah kemudian (mis. setelah `router.refresh()`)
 *   langsung tampil tanpa hitung ulang.
 * Format tanpa `Intl` (`formatCount`), jadi server dan browser selalu sama.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const final = `${prefix}${formatCount(value, decimals)}${suffix}`;
  const rootRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const finalRef = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    // Ubah isi simpul teks milik React (bukan textContent), supaya render berikutnya tetap benar.
    const text = valueRef.current?.firstChild;
    // Simpul salinan sr-only tetap sama antar render; isinya selalu nilai terbaru dari React.
    const latest = finalRef.current;
    if (!root || !(text instanceof Text) || typeof IntersectionObserver === "undefined") return;
    if (startedRef.current || motionLevelOf(root) === "off" || value === 0 || !Number.isFinite(value)) return;

    const show = (n: number) => {
      text.nodeValue = `${prefix}${formatCount(n, decimals)}${suffix}`;
    };
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        startedRef.current = true;
        // Token dibaca saat terlihat (gaya sudah dihitung browser), bukan saat hidrasi: tanpa
        // hitung ulang gaya paksa di tugas hidrasi.
        const duration = countUpDuration(
          motionLevelOf(root),
          parseCssTime(getComputedStyle(root).getPropertyValue("--motion-slow")),
        );
        if (duration === 0) return;
        const start = performance.now();
        show(0);
        const tick = (now: number) => {
          const progress = (now - start) / duration;
          show(countUpValue(value, progress, decimals));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Nilai TERBARU (React sudah menulisnya ke salinan sr-only saat render ulang), bukan nilai lama
      // dari closure ini: tanpa angka basi jika nilai berubah di tengah hitung naik.
      text.nodeValue = latest?.textContent ?? text.nodeValue;
    };
  }, [value, decimals, prefix, suffix]);

  return (
    <span ref={rootRef} className={cn("motion-count", className)}>
      <span ref={finalRef} className="sr-only">
        {final}
      </span>
      <span aria-hidden="true" className="motion-count-box">
        <span className="motion-count-ghost">{final}</span>
        <span ref={valueRef}>{final}</span>
      </span>
    </span>
  );
}
