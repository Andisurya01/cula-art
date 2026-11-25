"use client";

import { Check, Moon, Sun, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkContrast, formatRatio, type ContrastResult } from "@/lib/theme/contrast";
import { COLOR_GROUPS, COLOR_LABELS } from "@/lib/theme/meta";
import type { ColorSet, ThemeTokens } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import { countInvalid, setColor, type ColorMode } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { ColorField } from "./editor-fields";

const MODES: readonly { value: ColorMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Terang", icon: <Sun aria-hidden /> },
  { value: "dark", label: "Gelap", icon: <Moon aria-hidden /> },
];

/** Jumlah pasangan kontras yang gagal per mode (dari versi valid terakhir). */
export function failingContrastCount(colors: ColorSet, typography?: ThemeTokens["typography"]): number {
  return checkContrast(colors, typography).filter((result) => !result.ok).length;
}

export function ColorSection({ mode, onModeChange }: { mode: ColorMode; onModeChange: (mode: ColorMode) => void }) {
  const { preview, invalidPaths } = useThemeEditor();
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value === "dark" ? "dark" : "light")}>
      <TabsList className="w-full @sm/editor:w-fit">
        {MODES.map((m) => {
          const errors = countInvalid(invalidPaths, `colors.${m.value}`);
          const fails = failingContrastCount(preview.colors[m.value], preview.typography);
          return (
            <TabsTrigger key={m.value} value={m.value} className="px-4">
              {m.icon}
              {m.label}
              {errors > 0 ? (
                <CountBubble tone="error" count={errors} label={`${errors} isian perlu diperbaiki`} />
              ) : fails > 0 ? (
                <CountBubble tone="warning" count={fails} label={`${fails} pasangan kontras kurang`} />
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {MODES.map((m) => (
        <TabsContent key={m.value} value={m.value} className="space-y-4">
          <ColorModePanel mode={m.value} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CountBubble({ tone, count, label }: { tone: "error" | "warning"; count: number; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-caption tabular-nums",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
      )}
    >
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function ColorModePanel({ mode }: { mode: ColorMode }) {
  const { draft, preview, invalidPaths, edit } = useThemeEditor();
  const colors = preview.colors[mode];
  const results = checkContrast(colors, preview.typography);
  const fails = results.filter((r) => !r.ok).length;
  const modeLabel = mode === "light" ? "terang" : "gelap";

  return (
    <>
      {fails > 0 ? (
        // role="status" (bukan "alert"): pesan berubah saat warna digeser, jangan diumumkan terus-menerus.
        <Alert variant="warning" role="status">
          <TriangleAlert aria-hidden />
          <AlertTitle>
            {fails} pasangan warna mode {modeLabel} di bawah batas kontras
          </AlertTitle>
          <AlertDescription>
            Batas WCAG 4,5:1 untuk teks, 3:1 untuk judul besar dan fokus. Tetap bisa disimpan, tetapi teks bisa sulit
            dibaca.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-body-sm text-success">
          <Check aria-hidden className="size-4 shrink-0" />
          Semua pasangan warna mode {modeLabel} lolos batas kontras WCAG.
        </p>
      )}

      {COLOR_GROUPS.map((group) => {
        const headingId = `warna-${mode}-${group.id}`;
        const pairs = results.filter((r) => group.keys.includes(r.fg));
        return (
          <section
            key={group.id}
            aria-labelledby={headingId}
            className="space-y-4 rounded-card-nested bg-muted/60 p-4"
          >
            <h3 id={headingId} className="font-heading text-h6">
              {group.label}
            </h3>
            <div className="grid gap-4 @md/editor:grid-cols-2">
              {group.keys.map((key) => (
                <ColorField
                  key={key}
                  id={`warna-${mode}-${key}`}
                  label={COLOR_LABELS[key]}
                  value={draft.colors[mode][key]}
                  fallback={colors[key]}
                  invalid={invalidPaths.has(`colors.${mode}.${key}`)}
                  onChange={(value) => edit((d) => setColor(d, mode, key, value))}
                />
              ))}
            </div>
            {pairs.length > 0 ? <ContrastList results={pairs} colors={colors} /> : null}
          </section>
        );
      })}
    </>
  );
}

const minimumText = (min: number) => `${String(min).replace(".", ",")}:1`;

function ContrastList({ results, colors }: { results: ContrastResult[]; colors: ColorSet }) {
  return (
    <div className="space-y-2">
      <p className="type-label text-muted-foreground">Kontras</p>
      <ul className="grid gap-2 @md/editor:grid-cols-2">
        {results.map((result) => (
          <li
            key={result.id}
            className="flex min-w-0 items-center gap-3 rounded-card-nested bg-card p-2 pr-3 ring-1 ring-border/60"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-body-sm font-semibold ring-1 ring-border/60"
              style={{ backgroundColor: colors[result.bg], color: colors[result.fg] }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm">{result.label}</span>
              <span className="block text-caption text-muted-foreground tabular-nums">
                {formatRatio(result.ratio)} · min. {minimumText(result.min)}
              </span>
            </span>
            <Badge variant={result.ok ? "success" : "warning"}>
              {result.ok ? (
                <Check aria-hidden data-icon="inline-start" />
              ) : (
                <TriangleAlert aria-hidden data-icon="inline-start" />
              )}
              {result.ok ? "Lolos" : "Kurang"}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
