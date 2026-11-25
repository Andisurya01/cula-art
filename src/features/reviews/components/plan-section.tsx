"use client";

import { useState } from "react";
import Link from "next/link";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { CalendarPlus, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Button } from "@/components/ui/button";
import type { CalendarSlot } from "@/features/calendar/slots";
import { formatWib } from "@/lib/date";
import { CONTENT_STAGE_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { defaultPlanPlatforms, type PlanOption } from "../plan";
import { REVIEW_PLAN_MAX, type ReviewFormValues } from "../schema";
import { PlanScheduleDialog } from "./plan-schedule-dialog";

/** Kandidat yang langsung tampil; sisanya lewat "Lihat semua". */
const CANDIDATES_SHOWN = 5;

export type PlanSectionData = {
  /** Mis. "9-15 Nov 2026". */
  weekLabel: string;
  /** Minggu rencana belum berakhir. */
  editable: boolean;
  options: PlanOption[];
  slots: CalendarSlot[];
  now: Date;
};

/**
 * Pilih 2-3 konten untuk minggu rencana (E8) dan jadwalkan ke slot kosong lewat aksi Kalender.
 * Id terpilih ada di field form `plannedContentIds` dan tersimpan saat Simpan review.
 */
export function PlanSection({ form, plan }: { form: UseFormReturn<ReviewFormValues>; plan: PlanSectionData }) {
  const ids = useWatch({ control: form.control, name: "plannedContentIds" });
  const [scheduling, setScheduling] = useState<PlanOption | null>(null);
  const [showAll, setShowAll] = useState(false);

  const byId = new Map(plan.options.map((option) => [option.id, option]));
  const selected = ids.flatMap((id) => byId.get(id) ?? []);
  const candidates = plan.options.filter((option) => option.candidate && !ids.includes(option.id));
  const shown = showAll ? candidates : candidates.slice(0, CANDIDATES_SHOWN);
  const full = selected.length >= REVIEW_PLAN_MAX;
  const error = form.formState.errors.plannedContentIds?.message;

  function setIds(next: string[]) {
    form.setValue("plannedContentIds", next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div>
        <p className="text-sm font-medium">Konten untuk slot {plan.weekLabel}</p>
        <p className="text-xs text-muted-foreground">
          {plan.editable
            ? "Pilih 2-3 konten. Jadwal langsung tersimpan di Kalender; daftar rencana tersimpan saat kamu menekan Simpan review."
            : "Minggu rencana sudah lewat; daftar ini hanya catatan."}
        </p>
      </div>

      {selected.length > 0 ? (
        <ol className="grid grid-cols-1 gap-2">
          {selected.map((option, i) => (
            <PlanItem
              key={option.id}
              index={i}
              option={option}
              now={plan.now}
              editable={plan.editable}
              onSchedule={() => setScheduling(option)}
              onRemove={() => setIds(ids.filter((id) => id !== option.id))}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-card-nested border border-dashed px-4 py-3 text-sm text-muted-foreground">Belum ada konten di rencana.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {plan.editable &&
        (full ? (
          <p className="text-xs text-muted-foreground">
            Maksimal {REVIEW_PLAN_MAX} konten. Hapus satu dari rencana untuk menggantinya.
          </p>
        ) : candidates.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Tambah ke rencana (belum tayang dan belum terjadwal; Siap Posting didahulukan)
            </p>
            <ul className="divide-y overflow-hidden rounded-card-nested border">
              {shown.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setIds([...ids, option.id])}
                    aria-label={`Tambah ${option.title} ke rencana`}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-hidden hover:bg-muted/50 focus-visible:bg-muted"
                  >
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.title}</span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <PillarBadge name={option.pillarName} color={option.pillarColor} className="max-w-full min-w-0" />
                        <span className={cn(option.stage === "READY" && "font-medium text-foreground")}>
                          {CONTENT_STAGE_LABELS[option.stage]}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {candidates.length > CANDIDATES_SHOWN && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? <ChevronUp /> : <ChevronDown />}
                {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${candidates.length})`}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tidak ada konten yang belum tayang dan belum terjadwal.{" "}
            <Link href={routes.studio.pipeline} className="underline underline-offset-4 transition-colors hover:text-foreground">
              Buka Pipeline
            </Link>
          </p>
        ))}

      {scheduling && (
        <PlanScheduleDialog
          key={scheduling.id}
          content={scheduling}
          slots={plan.slots}
          weekLabel={plan.weekLabel}
          open
          onOpenChange={(open) => !open && setScheduling(null)}
        />
      )}
    </div>
  );
}

function PlanItem({
  index,
  option,
  now,
  editable,
  onSchedule,
  onRemove,
}: {
  index: number;
  option: PlanOption;
  now: Date;
  editable: boolean;
  onSchedule: () => void;
  onRemove: () => void;
}) {
  const lines = option.versions.flatMap((v) => {
    if (v.postedAt) return [{ platform: v.platform, text: `tayang ${formatWib(v.postedAt, "EEE d MMM, HH.mm")}`, late: false }];
    if (v.scheduledAt) {
      const late = v.scheduledAt.getTime() <= now.getTime();
      return [{ platform: v.platform, text: `${formatWib(v.scheduledAt, "EEE d MMM, HH.mm")}${late ? " (lewat)" : ""}`, late }];
    }
    return [];
  });
  const upcoming = option.versions.some((v) => !v.postedAt && v.scheduledAt && v.scheduledAt.getTime() > now.getTime());
  const canSchedule = editable && defaultPlanPlatforms(option.versions).length > 0;

  return (
    <li className="rounded-card-nested bg-muted p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={routes.studio.content(option.id)} className="block truncate text-sm font-medium underline-offset-4 hover:underline">
            {option.title}
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <PillarBadge name={option.pillarName} color={option.pillarColor} className="max-w-full min-w-0" />
            <span>{CONTENT_STAGE_LABELS[option.stage]}</span>
          </div>
          {lines.length > 0 ? (
            <ul className="text-xs">
              {lines.map((line) => (
                <li key={line.platform} className={cn(line.late && "text-warning")}>
                  <span className="font-medium">{PLATFORM_LABELS[line.platform]}</span> · {line.text} WIB
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-warning">Belum dijadwalkan</p>
          )}
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-1 shrink-0 hover:bg-card"
            aria-label={`Hapus ${option.title} dari rencana`}
            onClick={onRemove}
          >
            <X />
          </Button>
        )}
      </div>
      {canSchedule && (
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onSchedule}>
            <CalendarPlus />
            {upcoming ? "Ubah jadwal" : "Jadwalkan"}
          </Button>
        </div>
      )}
    </li>
  );
}
