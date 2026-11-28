"use client";

import { Info, RotateCcw } from "lucide-react";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { defaultThemeTokens, themeTokensEqual } from "@/lib/theme/defaults";
import { MOTION_LEVEL_LABELS } from "@/lib/theme/meta";
import type { MotionSide } from "@/lib/theme/motion";
import { EASING_IDS, EASINGS, MOTION_LEVELS, RANGES, type EasingId, type MotionLevel } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import { setMotion } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { NumberField, PillRadioGroup, SelectField, type SelectOption } from "./editor-fields";

const EASING_OPTIONS: readonly SelectOption<EasingId>[] = EASING_IDS.map((id) => ({ value: id, label: EASINGS[id].label }));
const LEVEL_OPTIONS = MOTION_LEVELS.map((value) => ({ value, label: MOTION_LEVEL_LABELS[value].label }));
const DEFAULT_MOTION = defaultThemeTokens().motion;

const SIDES: readonly { side: MotionSide; label: string; hint: string }[] = [
  { side: "gallery", label: "Galeri", hint: "Pengunjung publik. Bawaan Penuh." },
  { side: "studio", label: "Studio", hint: "Dipakai setiap hari, jadi gerak singkat. Bawaan Halus." },
];

/**
 * Bagian Animasi (Fase 7 langkah 4): tingkat per sisi (A2), durasi + easing (T7), jeda dan jarak (A6).
 * Efeknya bisa dilihat di pratinjau dengan tombol "Putar ulang".
 */
export function MotionSection() {
  const { draft, invalidPaths, edit } = useThemeEditor();
  const reduced = useReducedMotion();
  const motion = draft.motion;
  const isDefault = themeTokensEqual({ ...draft, motion: DEFAULT_MOTION }, draft);
  const allOff = motion.gallery === "off" && motion.studio === "off";
  const staggerWithoutDuration = !allOff && motion.stagger > 0 && (motion.base === 0 || motion.slow === 0);

  return (
    <>
      <div className="grid gap-4 @md/editor:grid-cols-2">
        {SIDES.map(({ side, label, hint }) => (
          <div key={side} className="min-w-0 space-y-2">
            <PillRadioGroup<MotionLevel>
              legend={`Tingkat animasi ${label}`}
              value={motion[side]}
              options={LEVEL_OPTIONS}
              onChange={(level) => edit((d) => setMotion(d, { [side]: level }))}
              fullWidth
            />
            <p className="text-caption text-muted-foreground">
              {MOTION_LEVEL_LABELS[motion[side]].description} {hint}
            </p>
          </div>
        ))}
      </div>

      {/* Durasi dan seterusnya tetap bisa diatur walau kedua sisi Mati (dipakai lagi saat dinyalakan). */}
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          id="animasi-cepat"
          label="Cepat (ms)"
          value={motion.fast}
          range={RANGES.durationFast}
          integer
          invalid={invalidPaths.has("motion.fast")}
          hint="Hover, tombol, menu"
          onChange={(fast) => edit((d) => setMotion(d, { fast }))}
        />
        <NumberField
          id="animasi-sedang"
          label="Sedang (ms)"
          value={motion.base}
          range={RANGES.durationBase}
          integer
          invalid={invalidPaths.has("motion.base")}
          hint="Dialog, halaman"
          onChange={(base) => edit((d) => setMotion(d, { base }))}
        />
        <NumberField
          id="animasi-lambat"
          label="Lambat (ms)"
          value={motion.slow}
          range={RANGES.durationSlow}
          integer
          invalid={invalidPaths.has("motion.slow")}
          hint="Muncul, foto"
          onChange={(slow) => edit((d) => setMotion(d, { slow }))}
        />
      </div>
      <div className="grid gap-3 @md/editor:grid-cols-3">
        <NumberField
          id="animasi-jeda"
          label="Jeda antar elemen (ms)"
          value={motion.stagger}
          range={RANGES.stagger}
          integer
          invalid={invalidPaths.has("motion.stagger")}
          hint="Kartu dan baris judul muncul bergantian"
          onChange={(stagger) => edit((d) => setMotion(d, { stagger }))}
        />
        <NumberField
          id="animasi-jarak"
          label="Jarak geser (px)"
          value={motion.distance}
          range={RANGES.distance}
          integer
          invalid={invalidPaths.has("motion.distance")}
          hint="Seberapa jauh elemen naik saat muncul"
          onChange={(distance) => edit((d) => setMotion(d, { distance }))}
        />
        <SelectField
          id="animasi-easing"
          label="Easing"
          value={motion.easing}
          options={EASING_OPTIONS}
          onChange={(easing) => edit((d) => setMotion(d, { easing }))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("text-caption", staggerWithoutDuration ? "text-warning" : "text-muted-foreground")}>
          {staggerWithoutDuration
            ? "Durasi sedang atau lambat 0 ms: elemen yang berjeda akan muncul tiba-tiba. Isi durasinya, atau jeda 0."
            : allOff
              ? "Galeri dan Studio tanpa animasi."
              : "Lihat efeknya di pratinjau dengan tombol Putar ulang."}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={() => edit((d) => setMotion(d, DEFAULT_MOTION))}
        >
          <RotateCcw aria-hidden />
          Animasi bawaan
        </Button>
      </div>

      <div className="flex gap-3 rounded-card-nested bg-muted p-4 text-body-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />
        <p>
          Pengunjung yang mengaktifkan &ldquo;kurangi gerakan&rdquo; di perangkatnya selalu melihat tampilan tanpa
          animasi, apa pun tingkat di sini. Isi tidak pernah disembunyikan oleh animasi.
          {reduced ? (
            <strong className="mt-1 block font-medium text-foreground">
              Perangkat ini sedang meminta kurangi gerakan, jadi pratinjau juga tanpa animasi.
            </strong>
          ) : null}
        </p>
      </div>
    </>
  );
}
