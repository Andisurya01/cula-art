"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { prepareReveal } from "./reveal-observer";

/**
 * Efek muncul saat di-scroll (CSS di `globals.css`, nilai dari token dan `data-motion`):
 * - `up`: fade + geser naik sejauh token jarak (Halus: lebih dekat);
 * - `fade`: hanya opacity.
 * Penyingkapan `clip-path` untuk elemen di layar pertama: utility `motion-enter-clip`.
 */
export type RevealEffect = "up" | "fade";

/** Kelas dan atribut efek muncul; gabungkan `className` dengan kelas sendiri lewat `cn`. */
export function revealProps(effect: RevealEffect = "up") {
  return { className: "motion-reveal", "data-reveal-effect": effect } as const;
}

/**
 * Ref untuk memasang efek muncul pada elemen milik komponen sendiri (tanpa pembungkus):
 * `const ref = useReveal<HTMLElement>()` lalu
 * `<article ref={ref} {...revealProps("up")} className={cn(revealProps().className, "…")}>`.
 * Elemen jangan punya `transition-*` sendiri (menimpa transisi muncul).
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    return element ? prepareReveal(element) : undefined;
  }, []);
  return ref;
}

type RevealTag = "div" | "section" | "article" | "li" | "span" | "p" | "figure" | "header" | "footer" | "aside";

/**
 * Pembungkus muncul saat di-scroll: sekali jalan, berjeda otomatis dengan elemen lain yang terlihat
 * bersamaan, dan isi selalu terlihat tanpa JavaScript (A4). Hanya `opacity`/`translate`/`clip-path`.
 */
export function Reveal({
  as: Tag = "div",
  effect = "up",
  className,
  children,
  ...props
}: { as?: RevealTag; effect?: RevealEffect } & React.HTMLAttributes<HTMLElement>) {
  const ref = useReveal<HTMLElement>();
  const reveal = revealProps(effect);
  return (
    <Tag
      // Ref tag dinamis: satu tipe HTMLElement untuk semua tag yang diizinkan.
      ref={ref as React.Ref<never>}
      {...props}
      data-reveal-effect={reveal["data-reveal-effect"]}
      className={cn(reveal.className, className)}
    >
      {children}
    </Tag>
  );
}
