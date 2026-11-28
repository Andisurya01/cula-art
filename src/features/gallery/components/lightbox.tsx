"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { motionLevelOf } from "@/components/motion/use-motion-level";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryImage } from "../dto";
import { lightboxOrigin, type LightboxOrigin } from "./lightbox-origin";
import {
  IDENTITY_VIEW,
  TAP_SCALE,
  distance,
  midpoint,
  panBy,
  pinchView,
  swipeDirection,
  toggleZoom,
  zoomTo,
  type Point,
  type Size,
  type ZoomView,
} from "../zoom";

type Gesture =
  | { kind: "pan"; pointerId: number; start: Point; startView: ZoomView; startTime: number; moved: boolean }
  | { kind: "pinch"; startView: ZoomView; distance: number; midpoint: Point };

/** Gerakan lebih kecil dari ini (px) masih dianggap ketukan. */
const TAP_SLOP = 8;
const TAP_MAX_MS = 350;

// Warna di atas foto selalu palet media (gelap di kedua mode), dari token tema.
const iconButton =
  "inline-flex size-11 items-center justify-center rounded-full bg-media-foreground/10 text-media-foreground backdrop-blur transition-colors hover:bg-media-foreground/20 outline-hidden focus-visible:ring-2 focus-visible:ring-media-foreground";

/**
 * Asal zoom dari foto di layar (Fase 7). Dibaca di event handler (klik buka / tutup), bukan saat render.
 * Tingkat animasi Mati / "kurangi gerakan" → null (buka/tutup langsung).
 */
export function lightboxOriginOf(element: Element | null | undefined): LightboxOrigin | null {
  if (!element) return null;
  return lightboxOrigin(element.getBoundingClientRect(), window.innerWidth, motionLevelOf(element));
}

/** `transform-origin` + skala awal/akhir animasi masuk/keluar Dialog (tw-animate, durasi token). */
function originStyle(origin: LightboxOrigin | null | undefined): React.CSSProperties | undefined {
  if (!origin) return undefined;
  return {
    transformOrigin: `${origin.x}px ${origin.y}px`,
    "--tw-enter-scale": origin.scale,
    "--tw-exit-scale": origin.scale,
  } as React.CSSProperties;
}

/**
 * Foto layar penuh: geser kiri/kanan (atau panah keyboard) untuk ganti foto, ketuk/klik untuk zoom,
 * cubit untuk zoom bebas, seret untuk menggeser foto yang diperbesar, roda mouse untuk zoom.
 * Foto asli (maks. 2400 px) dimuat tanpa optimasi supaya detail tetap tajam saat diperbesar.
 * Fase 7: membuka dan menutup dengan zoom dari foto asal (`origin`, hanya transform/opacity; durasi
 * dan easing token Dialog). Tanpa `origin` (gerak Mati) = animasi Dialog bawaan, yang 0 ms saat Mati.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  title,
  origin,
}: {
  images: GalleryImage[];
  /** Foto yang dibuka; null = tertutup. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
  /**
   * Asal zoom (`lightboxOriginOf` foto yang diklik saat membuka; foto yang sedang tampil saat menutup).
   * Diisi pemanggil bersamaan dengan `index`, supaya render buka/tutup sudah memakai asal yang benar.
   */
  origin?: LightboxOrigin | null;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const [view, setView] = useState<ZoomView>(IDENTITY_VIEW);
  const [gesturing, setGesturing] = useState(false);

  const total = images.length;
  // Foto terakhir tetap dirender selama animasi tutup (`index` sudah null), supaya layar penuh
  // mengecil kembali ke foto asal bersama fotonya, bukan sebagai bidang kosong.
  const [lastIndex, setLastIndex] = useState(index);
  if (index !== null && index !== lastIndex) setLastIndex(index);
  const shownIndex = index ?? lastIndex;
  const current = shownIndex !== null ? images[shownIndex] : undefined;
  const zoomed = view.scale > 1;

  function resetGesture() {
    pointers.current.clear();
    gesture.current = null;
    setGesturing(false);
  }

  function go(delta: number) {
    if (index === null || total < 2) return;
    resetGesture();
    setView(IDENTITY_VIEW);
    onIndexChange((index + delta + total) % total);
  }

  function close() {
    resetGesture();
    setView(IDENTITY_VIEW);
    onClose();
  }

  function stageSize(): Size {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }

  /** Posisi pointer relatif ke pusat panggung. */
  function localPoint(event: { clientX: number; clientY: number }): Point {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
  }

  function startPan(pointerId: number, point: Point, from: ZoomView, moved = false) {
    gesture.current = { kind: "pan", pointerId, start: point, startView: from, startTime: performance.now(), moved };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startView: view, distance: distance(a, b), midpoint: midpoint(a, b) };
    } else if (pointers.current.size === 1) {
      startPan(event.pointerId, point, view);
    }
    setGesturing(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      setView(
        pinchView(
          { view: g.startView, distance: g.distance, midpoint: g.midpoint },
          { distance: distance(a, b), midpoint: midpoint(a, b) },
          stageSize(),
        ),
      );
    } else if (g.kind === "pan" && g.pointerId === event.pointerId) {
      const delta = { x: point.x - g.start.x, y: point.y - g.start.y };
      if (!g.moved && Math.hypot(delta.x, delta.y) > TAP_SLOP) g.moved = true;
      if (g.startView.scale > 1) setView(panBy(g.startView, delta, stageSize()));
    }
  }

  function endPointer(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (!pointers.current.delete(event.pointerId)) return;
    const point = localPoint(event);
    const g = gesture.current;
    if (g?.kind === "pan" && g.pointerId === event.pointerId) {
      gesture.current = null;
      const delta = { x: point.x - g.start.x, y: point.y - g.start.y };
      if (!cancelled && !g.moved && performance.now() - g.startTime < TAP_MAX_MS) {
        setView(toggleZoom(view, point, stageSize()));
      } else if (!cancelled && g.moved && g.startView.scale === 1) {
        const direction = swipeDirection(delta);
        if (direction !== 0) go(direction);
      }
    } else if (g?.kind === "pinch") {
      // Sisa satu jari: lanjut menggeser dari posisi sekarang (bukan dianggap ketukan).
      const [remaining] = [...pointers.current.entries()];
      if (remaining) startPan(remaining[0], remaining[1], view, true);
      else gesture.current = null;
      if (view.scale < 1.05) setView(IDENTITY_VIEW);
    }
    if (pointers.current.size === 0) setGesturing(false);
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (event.deltaY === 0) return;
    setView(zoomTo(view, view.scale * (event.deltaY < 0 ? 1.25 : 0.8), localPoint(event), stageSize()));
  }

  function toggleFromButton() {
    setView(zoomed ? IDENTITY_VIEW : zoomTo(view, TAP_SCALE, { x: 0, y: 0 }, stageSize()));
  }

  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(1);
          else if (event.key === "ArrowLeft") go(-1);
        }}
        className="top-0 left-0 flex h-svh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-media p-0 text-media-foreground ring-0 sm:max-w-none"
        style={originStyle(origin)}
      >
        <DialogTitle className="sr-only">
          {current && shownIndex !== null ? `${title}, ${galleryCopy.detail.photoLabel(shownIndex + 1, total)}` : title}
        </DialogTitle>

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="rounded-badge bg-media-foreground/10 px-3 py-1.5 text-body-sm tabular-nums backdrop-blur" aria-hidden="true">
            {shownIndex !== null && galleryCopy.lightbox.counter(shownIndex + 1, total)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFromButton}
              className={iconButton}
              aria-label={zoomed ? galleryCopy.lightbox.zoomOut : galleryCopy.lightbox.zoomIn}
            >
              {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
            <button type="button" onClick={close} className={iconButton} aria-label={galleryCopy.lightbox.close}>
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endPointer(event, false)}
          onPointerCancel={(event) => endPointer(event, true)}
          onWheel={onWheel}
          className={cn(
            "relative flex-1 touch-none overflow-hidden select-none",
            zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          )}
        >
          {current && (
            <div
              // will-change hanya selama zoom/gestur (tidak dipasang permanen).
              className={cn("absolute inset-0", (zoomed || gesturing) && "will-change-transform")}
              style={{
                transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                // Durasi dan easing dari token tema (0 saat prefers-reduced-motion).
                transition: gesturing ? "none" : "transform var(--motion-fast) var(--motion-ease)",
              }}
            >
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                unoptimized
                draggable={false}
                className="pointer-events-none object-contain"
              />
            </div>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={cn(iconButton, "absolute top-1/2 left-3 z-10 -translate-y-1/2")}
              aria-label={galleryCopy.lightbox.prev}
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={cn(iconButton, "absolute top-1/2 right-3 z-10 -translate-y-1/2")}
              aria-label={galleryCopy.lightbox.next}
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}

        {/* Diumumkan pembaca layar saat foto berganti. */}
        <p className="sr-only" aria-live="polite">
          {current && index !== null ? `${galleryCopy.detail.photoLabel(index + 1, total)}: ${current.alt}` : ""}
        </p>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid gap-1 px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
          {current?.alt && <p className="mx-auto max-w-prose text-body-sm text-media-foreground/85">{current.alt}</p>}
          <p className="text-caption text-media-foreground/70">{galleryCopy.lightbox.hint}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
