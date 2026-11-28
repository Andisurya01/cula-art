"use client";

// Gerak seret bersama kanban Pipeline dan kalender (Fase 7): kartu terangkat saat diseret dan
// mendarat halus. Semua durasi/easing dari token; diam saat animasi Mati / "kurangi gerakan".

import { useCallback } from "react";
import { defaultDropAnimationSideEffects, useDndContext, type DropAnimation } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motionDurationOf, motionEasingOf, motionLevelOf } from "@/components/motion/use-motion-level";
import { cn } from "@/lib/utils";

/**
 * Isi `DragOverlay`: terangkat (`motion-lift`, skala + sedikit miring di Penuh) saat mulai diseret, dan
 * turun lagi saat dilepas sementara overlay meluncur ke tempatnya. dnd-kit memasang ulang isi overlay
 * saat animasi lepas (salinan), dan `active` di konteks dnd sudah null pada salinan itu; jadi salinan
 * dimulai terangkat lalu turun, sedangkan pemasangan saat mulai seret dimulai datar lalu terangkat.
 * Atribut `data-lifted` diubah langsung di DOM satu frame setelah dipasang, supaya transisi berjalan.
 */
export function DragLift({ className, children }: { className?: string; children: React.ReactNode }) {
  const dropping = useDndContext().active === null;
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      node.toggleAttribute("data-lifted", dropping);
      const frame = requestAnimationFrame(() => {
        // Pastikan status awal sudah dihitung browser, supaya perubahan berikut bertransisi.
        node.getBoundingClientRect();
        node.toggleAttribute("data-lifted", !dropping);
      });
      return () => cancelAnimationFrame(frame);
    },
    [dropping],
  );

  return (
    <div
      ref={ref}
      className={cn("transition-transform duration-fast ease-standard data-lifted:motion-lift", className)}
    >
      {children}
    </div>
  );
}

// Selama mendarat overlay tidak menangkap klik (kartu di bawahnya langsung bisa diklik), dan pada
// animasi meluncur kartu asal disembunyikan sampai overlay tiba di tempatnya.
const LANDING_OVERLAY = { dragOverlay: "pointer-events-none" };
const slideSideEffects = defaultDropAnimationSideEffects({
  className: LANDING_OVERLAY,
  styles: { active: { opacity: "0" } },
});
const fadeSideEffects = defaultDropAnimationSideEffects({ className: LANDING_OVERLAY });

/**
 * Kartu meluncur ke posisi kartu aslinya (kolom baru setelah dipindah, atau kembali ke asal jika batal /
 * ditolak). Durasi dasar + easing token. `null` (tanpa animasi) saat Mati / kurangi gerakan.
 * Dipanggil di event (mis. `onDragStart`), bukan saat render: membaca token dari DOM.
 */
export function dropAnimationFor(element: Element | null): DropAnimation | null {
  if (motionLevelOf(element) === "off") return null;
  const duration = motionDurationOf(element, "base");
  if (!(duration > 0)) return null;
  return { duration, easing: motionEasingOf(element), sideEffects: slideSideEffects };
}

/**
 * Kartu dilepas di sasaran yang menampilkan salinannya sendiri (mis. slot kalender memunculkan chip
 * baru): overlay memudar dan sedikit mengecil di tempat (`--motion-exit-scale`), kartu asal tetap
 * terlihat. `null` saat Mati / kurangi gerakan.
 */
export function fadeOutDropAnimation(element: Element | null): DropAnimation | null {
  if (motionLevelOf(element) === "off") return null;
  const duration = motionDurationOf(element, "fast");
  if (!(duration > 0)) return null;
  const parsed = Number.parseFloat(
    getComputedStyle(element ?? document.documentElement).getPropertyValue("--motion-exit-scale"),
  );
  const scale = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return {
    duration,
    easing: motionEasingOf(element),
    sideEffects: fadeSideEffects,
    keyframes: ({ transform: { initial } }) => [
      { opacity: 1, transform: CSS.Transform.toString(initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({ ...initial, scaleX: initial.scaleX * scale, scaleY: initial.scaleY * scale }),
      },
    ],
  };
}

/**
 * Geser dengan keyboard (overlay melompat antarkolom): transisi dari token, bukan bawaan dnd-kit
 * (`250ms ease`). Variabel CSS, jadi otomatis 0 saat Mati / kurangi gerakan. Pointer: tanpa transisi.
 */
export function keyboardOverlayTransition(activatorEvent: Event | null): string | undefined {
  return typeof KeyboardEvent !== "undefined" && activatorEvent instanceof KeyboardEvent
    ? "transform var(--motion-base) var(--motion-ease)"
    : undefined;
}
