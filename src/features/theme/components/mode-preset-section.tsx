"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { matchingPreset, PRESET_IDS, THEME_PRESETS, type PresetId } from "@/lib/theme/defaults";
import { FONT_OPTIONS } from "@/lib/theme/fonts";
import { MODE_LABELS } from "@/lib/theme/meta";
import { THEME_MODES, type ColorKey, type ThemeMode, type ThemeTokens } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import { setDefaultMode } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { PillRadioGroup } from "./editor-fields";

const MODE_ICONS: Record<ThemeMode, React.ReactNode> = {
  system: <Monitor aria-hidden />,
  light: <Sun aria-hidden />,
  dark: <Moon aria-hidden />,
};

const SWATCH_KEYS: readonly ColorKey[] = ["background", "surface", "text", "accent", "bentoBlue", "bentoLime"];

export function ModePresetSection() {
  const { draft, edit, applyPreset } = useThemeEditor();
  const active = matchingPreset(draft);

  return (
    <>
      <div className="space-y-2">
        <PillRadioGroup
          legend="Mode default pengunjung"
          value={draft.defaultMode}
          options={THEME_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode], icon: MODE_ICONS[mode] }))}
          onChange={(mode) => edit((d) => setDefaultMode(d, mode))}
          fullWidth
          className="max-w-md"
        />
        <p className="text-caption text-muted-foreground">
          Berlaku untuk pengunjung yang belum memilih sendiri lewat tombol mode di header. Pilihan pengunjung
          disimpan di browser mereka.
        </p>
      </div>

      <section aria-labelledby="preset-judul" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="preset-judul" className="font-heading text-h6">
            Preset
          </h3>
          {active === null ? <Badge variant="secondary">Diubah dari preset</Badge> : null}
        </div>
        <div className="grid gap-3 @md/editor:grid-cols-2">
          {PRESET_IDS.map((id) => (
            <PresetCard key={id} id={id} active={active === id} onApply={() => applyPreset(id)} />
          ))}
        </div>
        <p className="text-caption text-muted-foreground">
          Memilih preset mengganti semua warna, font, ukuran teks, bentuk, dan animasi (mode default tetap). Nilainya
          masih bisa diubah, dan belum berlaku sebelum disimpan.
        </p>
      </section>
    </>
  );
}

function PresetCard({ id, active, onApply }: { id: PresetId; active: boolean; onApply: () => void }) {
  const preset = THEME_PRESETS[id];
  const { typography } = preset.tokens;
  const fonts =
    typography.headingFont === typography.bodyFont
      ? FONT_OPTIONS[typography.headingFont].label
      : `${FONT_OPTIONS[typography.headingFont].label} + ${FONT_OPTIONS[typography.bodyFont].label}`;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-card-nested bg-muted p-4 ring-1 ring-transparent",
        active && "ring-2 ring-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="font-heading text-h6">{preset.label}</h4>
          <p className="text-body-sm text-muted-foreground">{preset.description}</p>
        </div>
        {active ? (
          <Badge>
            <Check aria-hidden data-icon="inline-start" />
            Aktif
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2">
        <Swatches tokens={preset.tokens} mode="light" />
        <Swatches tokens={preset.tokens} mode="dark" />
        <p className="type-label text-muted-foreground">{fonts}</p>
      </div>
      <Button
        type="button"
        variant={active ? "secondary" : "default"}
        disabled={active}
        onClick={onApply}
        className="mt-auto h-10"
      >
        {active ? "Sedang dipakai" : `Pakai ${preset.label}`}
      </Button>
    </div>
  );
}

function Swatches({ tokens, mode }: { tokens: ThemeTokens; mode: "light" | "dark" }) {
  const colors = tokens.colors[mode];
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-caption text-muted-foreground">{mode === "light" ? "Terang" : "Gelap"}</span>
      <span className="flex -space-x-1.5" aria-hidden>
        {SWATCH_KEYS.map((key) => (
          <span
            key={key}
            className="size-6 rounded-full ring-2 ring-muted"
            style={{ backgroundColor: colors[key] }}
          />
        ))}
      </span>
    </div>
  );
}
