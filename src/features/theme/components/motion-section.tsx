"use client";

import { Info } from "lucide-react";
import { EASING_IDS, EASINGS, RANGES, type EasingId } from "@/lib/theme/schema";
import { setMotion } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { NumberField, SelectField, type SelectOption } from "./editor-fields";

const EASING_OPTIONS: readonly SelectOption<EasingId>[] = EASING_IDS.map((id) => ({ value: id, label: EASINGS[id].label }));

export function MotionSection() {
  const { draft, invalidPaths, edit } = useThemeEditor();
  const motion = draft.motion;
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          id="animasi-cepat"
          label="Cepat (ms)"
          value={motion.fast}
          range={RANGES.durationFast}
          integer
          invalid={invalidPaths.has("motion.fast")}
          onChange={(fast) => edit((d) => setMotion(d, { fast }))}
        />
        <NumberField
          id="animasi-sedang"
          label="Sedang (ms)"
          value={motion.base}
          range={RANGES.durationBase}
          integer
          invalid={invalidPaths.has("motion.base")}
          onChange={(base) => edit((d) => setMotion(d, { base }))}
        />
        <NumberField
          id="animasi-lambat"
          label="Lambat (ms)"
          value={motion.slow}
          range={RANGES.durationSlow}
          integer
          invalid={invalidPaths.has("motion.slow")}
          onChange={(slow) => edit((d) => setMotion(d, { slow }))}
        />
      </div>
      <SelectField
        id="animasi-easing"
        label="Easing"
        value={motion.easing}
        options={EASING_OPTIONS}
        onChange={(easing) => edit((d) => setMotion(d, { easing }))}
        className="@md/editor:max-w-xs"
      />
      <div className="flex gap-3 rounded-card-nested bg-muted p-4 text-body-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />
        <p>
          Durasi dan easing sudah dipakai transisi yang ada (hover tombol, buka-tutup menu dan dialog). Animasi
          lengkap hadir di Fase 7. Pengunjung yang mengaktifkan &ldquo;kurangi gerak&rdquo; di perangkatnya tetap
          melihat tampilan tanpa animasi.
        </p>
      </div>
    </>
  );
}
