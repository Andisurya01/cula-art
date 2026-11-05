"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2, Sparkles, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AI_FEATURE_LABELS, type AiFeature } from "../features";
import { formatUsd } from "../format";
import { AI_MODELS, isAiModelId } from "../models";
import { useAiStatus } from "./ai-status";
import type { AiAssist } from "./use-ai-assist";

/** Tombol "Bantu AI" di samping field. Tidak tampil saat AI nonaktif. */
export function AiAssistButton({
  onClick,
  label = "Bantu AI",
  ariaLabel,
  className,
  disabled,
}: {
  onClick: () => void;
  label?: string;
  /** Untuk pembaca layar jika ada beberapa tombol berlabel sama (mis. "Bantu AI: caption TikTok"). */
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { enabled } = useAiStatus();
  if (!enabled) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Sparkles />
      {label}
    </Button>
  );
}

const desktopQuery = "(min-width: 768px)";
function subscribe(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
/** Desktop → panel dari kanan; HP → panel dari bawah. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
}

const INSTRUCTION_MAX = 500;

/**
 * Pola panel yang sama untuk semua fitur Bantu AI: hasil (children, final atau sementara), catatan AI,
 * kontrol tambahan, instruksi tambahan, perkiraan/biaya, Buat/Buat ulang/Hentikan.
 * `onGenerate(instruction)` dipanggil dengan instruksi; pemanggil menyusun input dari form saat ini.
 */
export function AiAssistPanel<F extends AiFeature>({
  assist,
  title,
  description,
  onGenerate,
  controls,
  generateDisabledReason,
  children,
}: {
  assist: AiAssist<F>;
  title?: string;
  description?: string;
  onGenerate: (instruction: string) => void;
  /** Kontrol khusus fitur (mis. pilih foto) di atas kolom instruksi. */
  controls?: React.ReactNode;
  /** Jika diisi, tombol Buat dimatikan dan alasannya ditampilkan (mis. "Isi judul dulu"). */
  generateDisabledReason?: string | null;
  children?: React.ReactNode;
}) {
  const status = useAiStatus();
  const desktop = useIsDesktop();
  const [instruction, setInstruction] = useState("");
  const { result, streaming, view } = assist;
  const notes = view && typeof view === "object" && "notes" in view ? (view as { notes?: string | null }).notes : null;

  const costText = streaming
    ? "AI sedang menulis…"
    : result
      ? result.mock
        ? "Mode uji: tanpa biaya"
        : `Biaya ${formatUsd(result.costUsd)} · ${isAiModelId(result.model) ? AI_MODELS[result.model].label : result.model}`
      : status.mock
        ? "Mode uji: tanpa biaya"
        : `Perkiraan ±${formatUsd(status.estimates[assist.feature])} per permintaan`;

  return (
    <Sheet open={assist.open} onOpenChange={assist.setOpen}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0",
          desktop ? "w-full sm:max-w-md" : "max-h-[88svh] rounded-t-xl",
        )}
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Bantu AI: {title ?? AI_FEATURE_LABELS[assist.feature]}
            {status.mock && <Badge variant="secondary">Mode uji</Badge>}
          </SheetTitle>
          <SheetDescription>
            {description ?? "Hasil hanya draf untuk form; tidak ada yang tersimpan sampai kamu menekan Simpan."}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-24 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-busy={streaming}>
          {view ? (
            children
          ) : streaming ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Menyiapkan draf…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tekan <strong>Buat</strong> untuk membuat draf dari isi form saat ini. Tambahkan instruksi jika perlu.
            </p>
          )}
          {notes && (
            <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Catatan AI:</span> {notes}
            </p>
          )}
        </div>

        <SheetFooter className="gap-3 border-t">
          {controls}
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value.slice(0, INSTRUCTION_MAX))}
            placeholder='Instruksi tambahan (opsional), mis. "lebih santai" atau "lebih singkat"'
            rows={2}
            maxLength={INSTRUCTION_MAX}
            aria-label="Instruksi tambahan untuk AI"
            className="min-h-0 resize-none text-sm"
          />
          {generateDisabledReason && !streaming && (
            <p className="text-xs text-destructive">{generateDisabledReason}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{costText}</span>
            {streaming ? (
              <Button type="button" variant="outline" size="sm" onClick={assist.cancel}>
                <Square />
                Hentikan
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={Boolean(generateDisabledReason)}
                onClick={() => onGenerate(instruction)}
              >
                <Sparkles />
                {result ? "Buat ulang" : "Buat"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Satu opsi hasil AI dengan tombol Pakai (aktif hanya untuk hasil final). */
export function AiOptionCard({
  label,
  onUse,
  useLabel = "Pakai",
  disabled,
  actions,
  children,
}: {
  label?: string;
  onUse?: () => void;
  useLabel?: string;
  disabled?: boolean;
  /** Aksi tambahan di samping Pakai (mis. "Simpan sebagai ide"). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="space-y-1.5 text-sm">{children}</div>
      {(onUse || actions) && (
        <div className="flex flex-wrap justify-end gap-2">
          {actions}
          {onUse && (
            <Button type="button" size="sm" variant="secondary" onClick={onUse} disabled={disabled}>
              {useLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Teks hasil AI dengan baris baru dipertahankan. */
export function AiText({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <p className={cn("break-words whitespace-pre-wrap", className)}>{children}</p>;
}
