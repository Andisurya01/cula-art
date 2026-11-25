"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import type { ThemeTokens } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import {
  PREVIEW_CANVAS_WIDTH,
  previewVariables,
  previewZoom,
  type PreviewMode,
  type PreviewWidth,
} from "../editor-preview";
import { PillRadioGroup } from "./editor-fields";
import { ThemeShowcase } from "./theme-showcase";

const MODE_OPTIONS = [
  { value: "light", label: "Terang", icon: <Sun aria-hidden /> },
  { value: "dark", label: "Gelap", icon: <Moon aria-hidden /> },
] as const;

const WIDTH_OPTIONS = [
  { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden /> },
  { value: "mobile", label: "HP", icon: <Smartphone aria-hidden /> },
] as const;

/**
 * Pratinjau langsung: variabel tema hanya dipasang di kontainer ini (situs belum berubah).
 * `tokens` wajib valid (versi valid terakhir dari draf). `idPrefix` membuat id di contoh unik,
 * karena pratinjau bisa dirender dua kali (kolom desktop dan Sheet HP).
 */
export function ThemePreview({
  tokens,
  mode,
  width,
  onModeChange,
  onWidthChange,
  idPrefix,
  frameClassName,
}: {
  tokens: ThemeTokens;
  mode: PreviewMode;
  width: PreviewWidth;
  onModeChange: (mode: PreviewMode) => void;
  onWidthChange: (width: PreviewWidth) => void;
  idPrefix: string;
  frameClassName?: string;
}) {
  // Kanvas selebar desktop (1280) atau HP (375) dengan ukuran teks level itu, diperkecil dengan `zoom`
  // supaya muat di kolom pratinjau: tata letak dan ukuran sama dengan situs di lebar tersebut.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const style: React.CSSProperties = {
    ...(previewVariables(tokens, mode, width) as React.CSSProperties),
    width: PREVIEW_CANVAS_WIDTH[width],
    zoom: previewZoom(frameWidth, width),
    // Kontrol native (scrollbar, input) mengikuti mode pratinjau, bukan mode situs.
    colorScheme: mode,
  };
  // Isi contoh tidak bergantung pada token (hanya variabel CSS kontainer yang berubah).
  const showcase = useMemo(() => <ThemeShowcase idPrefix={idPrefix} />, [idPrefix]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PillRadioGroup legend="Mode pratinjau" hideLegend value={mode} options={MODE_OPTIONS} onChange={onModeChange} />
        <PillRadioGroup
          legend="Lebar pratinjau"
          hideLegend
          value={width}
          options={WIDTH_OPTIONS}
          onChange={onWidthChange}
        />
      </div>
      <div
        ref={frameRef}
        className={cn(
          "overflow-x-hidden overflow-y-auto overscroll-contain rounded-card bg-muted p-2 ring-1 ring-border/70",
          frameClassName,
        )}
      >
        <div
          data-theme-preview={mode}
          // Contoh saja: tidak ikut urutan Tab dan tidak dibaca pembaca layar (judul contoh bukan judul halaman).
          inert
          style={style}
          className={cn(
            "@container mx-auto max-w-none shrink-0 rounded-card-nested bg-background px-4 py-6 font-sans text-body text-foreground [font-weight:var(--type-body-weight)] [letter-spacing:var(--type-body-tracking)] [line-height:var(--type-body-leading)] [&_:is(h1,h2,h3,h4,h5,h6)]:font-heading",
            mode === "dark" && "dark",
            width === "desktop" && "px-10 py-10",
          )}
        >
          {showcase}
        </div>
      </div>
      <p className="text-caption text-muted-foreground">
        Pratinjau belum mengubah situs. Simpan untuk menerapkan ke Galeri dan Studio.
      </p>
    </div>
  );
}
