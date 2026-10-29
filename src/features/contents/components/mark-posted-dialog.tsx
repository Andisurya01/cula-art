"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toWibInputValue } from "@/lib/date";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { postedFormSchema, toPostedEntries, type PostedFormValues } from "@/features/posts/schema";
import { markContentPosted } from "../actions";
import { errorMessage, unwrap } from "./client-utils";

export type PostedDialogPost = {
  platform: Platform;
  scheduledAt: Date | null;
  postedAt: Date | null;
  url: string | null;
};

export type PostedDialogTarget = {
  contentId: string;
  title: string;
  posts: PostedDialogPost[];
  /** Waktu saat dialog dibuka (untuk prefill waktu posting). */
  openedAt: Date;
};

/** Prefill: versi yang sudah ada dicentang; waktu = postedAt → jadwal yang sudah lewat → sekarang. */
export function buildPostedDefaults(posts: PostedDialogPost[], now: Date): PostedFormValues {
  const hasAny = posts.length > 0;
  return {
    entries: PLATFORMS.map((platform, index) => {
      const post = posts.find((p) => p.platform === platform);
      const fallbackTime =
        post?.scheduledAt && post.scheduledAt.getTime() <= now.getTime() ? post.scheduledAt : now;
      return {
        platform,
        enabled: hasAny ? !!post : index === 0,
        url: post?.url ?? "",
        postedAt: toWibInputValue(post?.postedAt ?? fallbackTime),
      };
    }),
  };
}

/**
 * Dialog wajib saat konten dipindah ke Posted. Batal → `onCancel` (pemanggil melakukan rollback).
 */
export function MarkPostedDialog({
  target,
  onCancel,
  onPosted,
}: {
  target: PostedDialogTarget | null;
  onCancel: () => void;
  onPosted: () => void;
}) {
  // Selama menyimpan, dialog tidak boleh ditutup (agar tidak rollback padahal server berhasil).
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        {target && (
          <MarkPostedForm
            key={`${target.contentId}-${target.openedAt.getTime()}`}
            target={target}
            onCancel={onCancel}
            onPosted={onPosted}
            onBusyChange={setBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MarkPostedForm({
  target,
  onCancel,
  onPosted,
  onBusyChange,
}: {
  target: PostedDialogTarget;
  onCancel: () => void;
  onPosted: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [defaults] = useState(() => buildPostedDefaults(target.posts, target.openedAt));
  const form = useForm<PostedFormValues>({
    resolver: zodResolver(postedFormSchema),
    defaultValues: defaults,
  });
  const entries = useWatch({ control: form.control, name: "entries" });
  const errors = form.formState.errors.entries;
  const rootError = errors?.message ?? errors?.root?.message;

  const mutation = useMutation({
    mutationFn: (values: PostedFormValues) =>
      unwrap(markContentPosted({ contentId: target.contentId, entries: toPostedEntries(values) })),
    onMutate: () => onBusyChange(true),
    onSettled: () => onBusyChange(false),
    onSuccess: () => {
      toast.success("Konten dipindah ke Posted");
      onPosted();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Pindah ke Posted</DialogTitle>
        <DialogDescription>
          Isi link post dan waktu posting aktual (WIB) untuk minimal satu platform:{" "}
          <span className="font-medium text-foreground">{target.title}</span>
        </DialogDescription>
      </DialogHeader>

      {PLATFORMS.map((platform, index) => {
        const enabled = entries?.[index]?.enabled ?? false;
        const entryErrors = errors?.[index];
        return (
          <fieldset key={platform} className="grid gap-3 rounded-lg border p-3">
            <Controller
              control={form.control}
              name={`entries.${index}.enabled`}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  Sudah diposting di {PLATFORM_LABELS[platform]}
                </label>
              )}
            />
            {enabled && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor={`posted-url-${platform}`}>Link post</Label>
                  <Input
                    id={`posted-url-${platform}`}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder={
                      platform === "TIKTOK"
                        ? "https://www.tiktok.com/@akun/video/…"
                        : "https://www.instagram.com/reel/…"
                    }
                    aria-invalid={!!entryErrors?.url}
                    {...form.register(`entries.${index}.url`)}
                  />
                  {entryErrors?.url && (
                    <p className="text-xs text-destructive">{entryErrors.url.message}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`posted-at-${platform}`}>Waktu posting (WIB)</Label>
                  <Input
                    id={`posted-at-${platform}`}
                    type="datetime-local"
                    aria-invalid={!!entryErrors?.postedAt}
                    {...form.register(`entries.${index}.postedAt`)}
                  />
                  {entryErrors?.postedAt && (
                    <p className="text-xs text-destructive">{entryErrors.postedAt.message}</p>
                  )}
                </div>
              </>
            )}
          </fieldset>
        );
      })}

      {rootError && <p className="text-sm text-destructive">{rootError}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Batal
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Menyimpan…" : "Simpan & pindah"}
        </Button>
      </DialogFooter>
    </form>
  );
}
