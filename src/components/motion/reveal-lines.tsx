"use client";

import { Fragment, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motionIndex } from "./motion-utils";
import { prepareReveal } from "./reveal-observer";

export interface RevealLine {
  content: React.ReactNode;
  className?: string;
}

type LinesTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

/**
 * Teks per baris dengan mask naik (Fase 7): setiap baris di dalam "jendela" yang memotong teks, lalu
 * naik ke tempatnya berjeda token `stagger`.
 * - `trigger="load"`: animasi CSS murni sejak lukisan pertama (hero di layar pertama, tanpa menunggu
 *   hidrasi). Tanpa JS, `data-motion` tidak ada sehingga teks langsung diam di tempat.
 * - `trigger="scroll"`: sekali saat terlihat, seperti `Reveal`.
 * Baris = bagian logis (mis. dua warna judul), bukan baris visual hasil bungkus teks: tanpa
 * pengukuran JS dan tanpa layout shift. Spasi di antara baris tetap ada untuk pembaca layar.
 */
export function RevealLines({
  as: Tag = "span",
  lines,
  trigger = "load",
  className,
  id,
  delay = 0,
}: {
  as?: LinesTag;
  lines: readonly RevealLine[];
  trigger?: "load" | "scroll";
  className?: string;
  id?: string;
  /** Urutan awal (dalam satuan jeda), mis. 1 jika ada elemen lain yang muncul lebih dulu. */
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    return trigger === "scroll" && element ? prepareReveal(element) : undefined;
  }, [trigger]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      data-lines-trigger={trigger}
      className={cn("motion-lines", trigger === "scroll" && "motion-reveal", className)}
      {...(trigger === "scroll" ? { "data-reveal-effect": "lines" } : {})}
    >
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className="motion-line">
            <span className={cn("motion-line-inner", line.className)} style={motionIndex(delay + i)}>
              {line.content}
            </span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
