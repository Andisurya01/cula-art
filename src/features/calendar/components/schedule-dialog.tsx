"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWib, toWibInputValue } from "@/lib/date";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { scheduleContentSchema, type ScheduleContentInput } from "../schema";
import { defaultPlatforms, postedPlatforms, type ReadyContent } from "../schedule";
import type { CalendarSlot } from "../slots";

type Mode = "slot" | "custom";

/**
 * Alternatif tanpa drag (satu-satunya cara di HP): pilih slot kosong 14 hari ke depan atau
 * tanggal + jam bebas (WIB), lalu platform. Render dengan `key={content.id}` agar form direset.
 */
export function ScheduleDialog({
  content,
  upcomingSlots,
  now,
  open,
  onOpenChange,
  onSubmit,
}: {
  content: ReadyContent;
  upcomingSlots: CalendarSlot[];
  now: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScheduleContentInput) => void;
}) {
  const [mode, setMode] = useState<Mode>(upcomingSlots.length > 0 ? "slot" : "custom");
  const posted = postedPlatforms(content);

  const form = useForm<ScheduleContentInput>({
    resolver: zodResolver(scheduleContentSchema),
    defaultValues: {
      contentId: content.id,
      scheduledAt: upcomingSlots[0]?.key ?? "",
      platforms: defaultPlatforms(content),
    },
  });
  const scheduledAt = useWatch({ control: form.control, name: "scheduledAt" });
  const platforms = useWatch({ control: form.control, name: "platforms" });
  const errors = form.formState.errors;

  function switchMode(next: Mode) {
    setMode(next);
    form.setValue("scheduledAt", next === "slot" ? (upcomingSlots[0]?.key ?? "") : "");
    form.clearErrors("scheduledAt");
  }

  function togglePlatform(platform: Platform, checked: boolean) {
    const next = PLATFORMS.filter((p) =>
      p === platform ? checked : platforms.includes(p),
    );
    form.setValue("platforms", next, { shouldValidate: form.formState.isSubmitted });
  }

  const submit = form.handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Jadwalkan</DialogTitle>
            <DialogDescription className="truncate">{content.title}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label id="schedule-time-mode">Waktu (WIB)</Label>
            <div
              className="inline-flex w-fit rounded-lg bg-muted p-[3px]"
              role="radiogroup"
              aria-labelledby="schedule-time-mode"
            >
              {(
                [
                  ["slot", "Slot kosong"],
                  ["custom", "Tanggal & jam lain"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => switchMode(value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    mode === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "slot" ? (
              upcomingSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tidak ada slot kosong 14 hari ke depan. Pilih tanggal & jam lain.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Slot kosong terdekat"
                  className="grid max-h-56 gap-1 overflow-y-auto pr-1"
                >
                  {upcomingSlots.map((slot) => (
                      <button
                        key={slot.key}
                        type="button"
                        role="radio"
                        aria-checked={scheduledAt === slot.key}
                        onClick={() => form.setValue("scheduledAt", slot.key, { shouldValidate: true })}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border border-dashed px-3 py-2 text-left text-sm transition-colors",
                          scheduledAt === slot.key
                            ? "border-solid border-primary bg-primary/10"
                            : "hover:bg-muted",
                        )}
                      >
                        <span className="capitalize">{formatWib(slot.at, "EEEE, d MMM")}</span>
                        <span
                          className={cn(
                            "tabular-nums",
                            slot.urgency === "soon" && "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {slot.time.replace(":", ".")}
                        </span>
                      </button>
                  ))}
                </div>
              )
            ) : (
              <Input
                type="datetime-local"
                min={toWibInputValue(now)}
                aria-label="Tanggal dan jam (WIB)"
                aria-invalid={!!errors.scheduledAt}
                {...form.register("scheduledAt")}
              />
            )}
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>
            )}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Platform</legend>
            {PLATFORMS.map((platform) => {
              const isPosted = posted.includes(platform);
              const id = `schedule-platform-${platform}`;
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
                    {isPosted && <span className="text-xs font-normal">(sudah diposting)</span>}
                  </Label>
                </div>
              );
            })}
            {errors.platforms && (
              <p className="text-xs text-destructive">{errors.platforms.message}</p>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit">Jadwalkan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
