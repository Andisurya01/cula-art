"use client";

import { SHAPE_LABELS } from "@/lib/theme/meta";
import { RANGES, type ThemeTokens } from "@/lib/theme/schema";
import { setShape } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { NumberField, SwitchField } from "./editor-fields";

type RadiusKey = keyof typeof SHAPE_LABELS;
type PillKey = "buttonPill" | "badgePill";

const RADIUS_KEYS = Object.keys(SHAPE_LABELS) as RadiusKey[];
const PILL_FOR: Partial<Record<RadiusKey, PillKey>> = { button: "buttonPill", badge: "badgePill" };

const PILL_TEXT: Record<PillKey, { label: string; description: string }> = {
  buttonPill: { label: "Tombol berbentuk pil", description: "Ujung tombol bulat penuh, seperti referensi." },
  badgePill: { label: "Badge berbentuk pil", description: "Ujung badge bulat penuh." },
};

export function ShapeSection() {
  return (
    <div className="grid gap-3 @md/editor:grid-cols-2">
      {RADIUS_KEYS.map((key) => (
        <RadiusCard key={key} radiusKey={key} />
      ))}
    </div>
  );
}

function RadiusCard({ radiusKey }: { radiusKey: RadiusKey }) {
  const { draft, preview, invalidPaths, edit } = useThemeEditor();
  const pillKey = PILL_FOR[radiusKey];
  const pill = pillKey ? draft.shape[pillKey] : false;
  const label = SHAPE_LABELS[radiusKey];
  const sampleRadius = pillKey && preview.shape[pillKey] ? 9999 : preview.shape[radiusKey];

  return (
    <div className="space-y-3 rounded-card-nested bg-muted/60 p-4">
      <div className="flex items-start gap-3">
        <RadiusSample radius={sampleRadius} />
        <NumberField
          id={`bentuk-${radiusKey}`}
          label={`${label} (px)`}
          value={draft.shape[radiusKey]}
          range={RANGES.radius}
          integer
          disabled={pill}
          hint={pill ? "Diabaikan selama bentuk pil aktif." : undefined}
          invalid={invalidPaths.has(`shape.${radiusKey}`)}
          onChange={(value) => edit((d) => setShape(d, { [radiusKey]: value } as Partial<ThemeTokens["shape"]>))}
          className="flex-1"
        />
      </div>
      {pillKey ? (
        <SwitchField
          id={`bentuk-${pillKey}`}
          label={PILL_TEXT[pillKey].label}
          description={PILL_TEXT[pillKey].description}
          checked={pill}
          onChange={(checked) =>
            edit((d) => {
              // Isian radius dinonaktifkan selama pil aktif; nilai tidak valid di dalamnya (mis. kosong)
              // diganti versi valid terakhir supaya Simpan tidak tertahan oleh isian yang tak bisa diubah.
              const radius = d.shape[radiusKey];
              const keepRadius = checked && !Number.isFinite(radius) ? preview.shape[radiusKey] : radius;
              return setShape(d, { [pillKey]: checked, [radiusKey]: keepRadius } as Partial<ThemeTokens["shape"]>);
            })
          }
        />
      ) : null}
    </div>
  );
}

/** Contoh sudut: garis atas-kiri dengan radius yang dipilih (pil = seperempat lingkaran). */
function RadiusSample({ radius }: { radius: number }) {
  return (
    <span
      aria-hidden
      className="mt-6.5 size-10 shrink-0 border-t-2 border-l-2 border-foreground bg-card"
      style={{ borderTopLeftRadius: `${Math.min(radius, 40)}px` }}
    />
  );
}
