"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { scheduleContent } from "@/features/calendar/actions";
import { scheduleContentSchema } from "@/features/calendar/schema";
import type { CalendarSlot } from "@/features/calendar/slots";
import { defaultPlanPlatforms, type PlanOption } from "../plan";

/**
 * Jadwalkan satu konten rencana ke slot kosong minggu rencana (hanya slot yang belum lewat) lewat aksi
 * Kalender `scheduleContent`. Jadwal langsung tersimpan; daftar rencana tetap menunggu Simpan review.
 * Tanpa `<form>`: dialog dirender di dalam form review, dan event submit portal ikut naik ke form itu.
 */
export function PlanScheduleDialog({
  content,
  slots,
  weekLabel,
  open,
  onOpenChange,
}: {
  content: PlanOption;
  slots: readonly CalendarSlot[];
  weekLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slotKey, setSlotKey] = useState(slots[0]?.key ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(() => defaultPlanPlatforms(content.versions));
  const posted = content.versions.filter((v) => v.postedAt !== null).map((v) => v.platform);

  function togglePlatform(platform: Platform, checked: boolean) {
    setPlatforms((current) => PLATFORMS.filter((p) => (p === platform ? checked : current.includes(p))));
  }

  function submit() {
    const parsed = scheduleContentSchema.safeParse({ contentId: content.id, scheduledAt: slotKey, platforms });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Pilih slot dan platform");
      return;
    }
    const slot = slots.find((s) => s.key === slotKey);
    startTransition(async () => {
      const result = await callAction(() => scheduleContent(parsed.data));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const when = slot ? `, ${formatWib(slot.at, "EEEE d MMM, HH.mm")} WIB` : "";
      toast.success(`Dijadwalkan di ${result.data.scheduled.map((p) => PLATFORM_LABELS[p]).join(" & ")}${when}`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jadwalkan ke minggu rencana</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">{content.title}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <p className="text-sm font-medium" id="plan-slot-label">
            Slot kosong {weekLabel} (WIB)
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada slot kosong yang belum lewat di minggu ini. Tambah slot posting di{" "}
              <Link href={routes.studio.settings} className="underline underline-offset-4">
                Pengaturan
              </Link>{" "}
              atau pilih tanggal lain di{" "}
              <Link href={routes.studio.calendar} className="underline underline-offset-4">
                Kalender
              </Link>
              .
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="plan-slot-label" className="grid max-h-56 gap-1 overflow-y-auto pr-1">
              {slots.map((slot) => (
                <button
                  key={slot.key}
                  type="button"
                  role="radio"
                  aria-checked={slotKey === slot.key}
                  onClick={() => setSlotKey(slot.key)}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-input border border-dashed px-3.5 py-2 text-left text-sm transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
                    slotKey === slot.key ? "border-solid border-primary bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <span className="capitalize">{formatWib(slot.at, "EEEE, d MMM")}</span>
                  <span className="tabular-nums">{slot.time.replace(":", ".")}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Platform</legend>
          {PLATFORMS.map((platform) => {
            const isPosted = posted.includes(platform);
            const id = `plan-platform-${content.id}-${platform}`;
            return (
              <div key={platform} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={platforms.includes(platform)}
                  disabled={isPosted}
                  onCheckedChange={(checked) => togglePlatform(platform, checked === true)}
                />
                <Label htmlFor={id} className={cn(isPosted && "text-muted-foreground")}>
                  {PLATFORM_LABELS[platform]}
                  {isPosted && <span className="text-xs font-normal">(sudah tayang)</span>}
                </Label>
              </div>
            );
          })}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || slots.length === 0 || !slotKey || platforms.length === 0}
          >
            {pending ? "Menjadwalkan…" : "Jadwalkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
