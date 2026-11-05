"use client";

import { useState } from "react";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiAssistButton, AiAssistPanel, AiOptionCard, AiText } from "@/features/ai/components/ai-assist-panel";
import { useAiAssist } from "@/features/ai/components/use-ai-assist";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  AI_NOTES_MAX,
  MAX_ARTWORK_AI_PHOTOS,
  aiPhotoOrder,
  aiPhotosBlockedReason,
  appliedMessage,
  resolveAiPhotoSelection,
  toArtworkPhotosInput,
  toggleAiPhoto,
  usableAiParts,
  type ArtworkAiPart,
} from "../ai-from-photos";
import { mergeAltDrafts } from "../alt-drafts";
import type { ArtworkDetailFormValues, ArtworkDetailInput } from "../schema";
import { useAltDrafts } from "./alt-drafts-provider";
import type { PhotoItem } from "./photo-list";

type ArtworkForm = UseFormReturn<ArtworkDetailFormValues, unknown, ArtworkDetailInput>;

const FILL = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Bantu AI "Dari foto": maks. 4 foto karya + catatan → ringkasan, cerita, dan teks alternatif per foto.
 * Ringkasan/cerita mengisi form detail; teks alternatif masuk editor alt per foto sebagai draf.
 * Tidak ada yang tersimpan sampai pengguna menekan Simpan.
 */
export function ArtworkPhotosAssist({
  artworkId,
  photos,
  form,
  className,
}: {
  artworkId: string;
  photos: PhotoItem[];
  form: ArtworkForm;
  className?: string;
}) {
  const assist = useAiAssist("artwork-photos");
  const altDrafts = useAltDrafts();
  /** null = pengguna belum mengubah pilihan (pakai pilihan awal: cover + 3 berikutnya). */
  const [selection, setSelection] = useState<string[] | null>(null);
  const [notes, setNotes] = useState("");
  const [used, setUsed] = useState<{ runId: string; parts: ArtworkAiPart[] }>({ runId: "", parts: [] });

  const ordered = aiPhotoOrder(photos);
  const selected = resolveAiPhotoSelection(photos, selection);
  const full = selected.length >= MAX_ARTWORK_AI_PHOTOS;
  const photoById = new Map(photos.map((p) => [p.id, p]));

  const view = assist.view;
  const result = assist.final ? assist.result : null;
  const usable = result ? usableAiParts(result.data) : [];
  const usedParts = result && used.runId === result.runId ? used.parts : [];

  function generate(instruction: string) {
    if (aiPhotosBlockedReason(photos.length, selected.length)) return;
    const input = toArtworkPhotosInput({ artworkId, imageIds: selected, notes, values: form.getValues() });
    void assist.generate(input, { instruction });
  }

  /** Pakai sebagian atau semua bagian hasil final. Hanya mengisi form/draf, tidak menyimpan. */
  function applyParts(parts: ArtworkAiPart[], close: boolean) {
    if (!result) return;
    const data = result.data;
    const altCount = parts.includes("alts") ? mergeAltDrafts(altDrafts.drafts, data.alts, photos).applied.length : 0;
    assist.apply(
      () => {
        if (parts.includes("summary")) form.setValue("summary", data.summary, FILL);
        if (parts.includes("description")) form.setValue("description", data.description, FILL);
        if (parts.includes("alts")) altDrafts.applySuggestions(data.alts, photos);
      },
      { close, message: appliedMessage(parts, altCount) },
    );
    setUsed({ runId: result.runId, parts: [...new Set([...usedParts, ...parts])] });
  }

  function partProps(part: ArtworkAiPart) {
    return {
      onUse: () => applyParts([part], false),
      disabled: !usable.includes(part),
      useLabel: usedParts.includes(part) ? "Pakai lagi" : "Pakai",
    };
  }

  const alts = view?.alts ?? [];
  const waiting = (
    <p className="text-muted-foreground">{assist.streaming ? "Menunggu…" : "(kosong)"}</p>
  );

  return (
    <>
      <AiAssistButton label="Dari foto" className={className} onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        description="Dari foto terpilih dan catatanmu: ringkasan, cerita, dan teks alternatif per foto. Semuanya draf; tidak ada yang tersimpan sampai kamu menekan Simpan."
        generateDisabledReason={aiPhotosBlockedReason(photos.length, selected.length)}
        onGenerate={generate}
        controls={
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p id="ai-artwork-photos-label" className="text-xs font-medium">
                Foto untuk AI
              </p>
              {photos.length > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {selected.length} dari maks. {MAX_ARTWORK_AI_PHOTOS}
                </p>
              )}
            </div>
            {photos.length > 0 ? (
              <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-1.5" aria-labelledby="ai-artwork-photos-label">
                {ordered.map((photo, index) => {
                  const checked = selected.includes(photo.id);
                  const disabled = assist.streaming || (!checked && full);
                  const id = `ai-artwork-photo-${photo.id}`;
                  return (
                    <li key={photo.id} className="shrink-0">
                      <label
                        htmlFor={id}
                        className={cn(
                          "relative block size-14 overflow-hidden rounded-md bg-muted ring-2 transition",
                          checked ? "ring-primary" : "ring-transparent",
                          disabled ? "cursor-not-allowed" : "cursor-pointer",
                          !checked && "opacity-60",
                        )}
                      >
                        <Image src={routes.media(photo.storageKey)} alt="" fill sizes="56px" className="object-cover" />
                        <Checkbox
                          id={id}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => setSelection(toggleAiPhoto(selected, photo.id))}
                          aria-label={photoLabel(photo, index)}
                          className="absolute top-1 left-1 bg-background"
                        />
                        {photo.isCover && (
                          <Star className="absolute top-1 right-1 size-3.5 fill-primary text-primary" aria-hidden />
                        )}
                        {photo.isProcess && (
                          <span className="absolute inset-x-0 bottom-0 bg-background/85 text-center text-[10px] leading-4">
                            Proses
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada foto di kartu Foto.</p>
            )}
            <div className="grid gap-1">
              <Label htmlFor="ai-artwork-notes" className="text-xs">
                Catatan untuk AI (opsional)
              </Label>
              <Textarea
                id="ai-artwork-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, AI_NOTES_MAX))}
                maxLength={AI_NOTES_MAX}
                rows={2}
                disabled={assist.streaming}
                placeholder="mis. inspirasi, untuk siapa karya ini dibuat, tantangan saat membuat"
                className="min-h-0 resize-none text-sm"
              />
            </div>
          </div>
        }
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {assist.final ? "Periksa dulu, lalu pakai sebagian atau semuanya." : "AI sedang menulis…"}
          </p>
          <Button type="button" size="sm" disabled={usable.length === 0} onClick={() => applyParts(usable, true)}>
            Pakai semua
          </Button>
        </div>

        <AiOptionCard label="Ringkasan satu kalimat" {...partProps("summary")}>
          {view?.summary ? <AiText>{view.summary}</AiText> : waiting}
        </AiOptionCard>

        <AiOptionCard label="Cerita / deskripsi" {...partProps("description")}>
          {view?.description ? <AiText>{view.description}</AiText> : waiting}
        </AiOptionCard>

        <AiOptionCard label="Teks alternatif per foto" {...partProps("alts")}>
          {alts.length > 0 ? (
            <ul className="grid gap-2">
              {alts.map((alt, i) => {
                const photo = alt.imageId ? photoById.get(alt.imageId) : undefined;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {photo && (
                        <Image
                          src={routes.media(photo.storageKey)}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <AiText className="min-w-0 flex-1">{alt.alt}</AiText>
                  </li>
                );
              })}
            </ul>
          ) : (
            waiting
          )}
          <p className="text-xs text-muted-foreground">
            Masuk ke editor teks alternatif di kartu Foto sebagai draf, lalu simpan per foto.
          </p>
        </AiOptionCard>
      </AiAssistPanel>
    </>
  );
}

function photoLabel(photo: PhotoItem, index: number): string {
  const kind = photo.isCover ? " (cover)" : photo.isProcess ? " (foto proses)" : "";
  return `Foto ${index + 1}${kind}${photo.alt ? `: ${photo.alt}` : ""}`;
}
