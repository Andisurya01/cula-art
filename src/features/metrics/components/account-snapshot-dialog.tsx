"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
import { callAction } from "@/lib/action-client";
import { formatWib, toWibDateString } from "@/lib/date";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { saveAccountSnapshots } from "../actions";
import { formatCount } from "../format";
import { withCountSuffix } from "../parse-count";
import {
  accountSnapshotsSchema,
  type AccountSnapshotsFormValues,
  type AccountSnapshotsValues,
} from "../schema";
import { CountSuffixChips } from "./count-suffix-chips";

/** Snapshot terakhir per platform, ditampilkan sebagai pembanding saat mengisi. */
export type LatestFollowers = {
  platform: Platform;
  date: Date | null;
  followers: number | null;
};

/** Tombol + dialog: followers per platform sekaligus. `latest` boleh kosong. */
export function AccountSnapshotButton({
  latest = [],
  children,
  className,
  variant = "outline",
  size = "sm",
}: {
  latest?: readonly LatestFollowers[];
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [open, setOpen] = useState(false);
  // Selama menyimpan, dialog tidak boleh ditutup.
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          {open && <AccountSnapshotForm latest={latest} onBusyChange={setBusy} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountSnapshotForm({
  latest,
  onBusyChange,
  onDone,
}: {
  latest: readonly LatestFollowers[];
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [today] = useState(() => toWibDateString(new Date()));
  const [activePlatform, setActivePlatform] = useState<Platform>("TIKTOK");
  const form = useForm<AccountSnapshotsFormValues, unknown, AccountSnapshotsValues>({
    resolver: zodResolver(accountSnapshotsSchema),
    defaultValues: { date: today, TIKTOK: "", INSTAGRAM: "" },
  });
  const { errors } = form.formState;

  const { setFocus } = form;
  useEffect(() => {
    setFocus("TIKTOK");
  }, [setFocus]);

  const onSubmit = form.handleSubmit((values) => {
    onBusyChange(true);
    startTransition(async () => {
      const result = await callAction(() => saveAccountSnapshots(values));
      onBusyChange(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Snapshot followers tersimpan");
      onDone();
      router.refresh();
    });
  });

  /** Tambahkan akhiran ke field platform yang sedang aktif tanpa menutup keyboard HP. */
  function appendSuffix(suffix: string) {
    const current = form.getValues(activePlatform);
    const next = withCountSuffix(typeof current === "string" ? current : "", suffix);
    if (next === "") return;
    form.setValue(activePlatform, next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    form.setFocus(activePlatform);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Snapshot followers</DialogTitle>
        <DialogDescription>
          Isi platform yang ingin dicatat. Tanggal yang sudah terisi akan ditimpa.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="account-snapshot-date">Tanggal (WIB)</Label>
        <Input
          id="account-snapshot-date"
          type="date"
          max={today}
          aria-invalid={!!errors.date}
          {...form.register("date")}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const last = latest.find((item) => item.platform === platform);
          const error = errors[platform]?.message;
          const id = `account-snapshot-${platform}`;
          return (
            <div key={platform} className="grid content-start gap-1.5">
              <Label htmlFor={id}>Followers {PLATFORM_LABELS[platform]}</Label>
              <Input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={last?.followers != null ? formatCount(last.followers) : "12.345"}
                aria-invalid={!!error}
                onFocus={() => setActivePlatform(platform)}
                {...form.register(platform)}
              />
              {last?.date && last.followers !== null && (
                <p className="text-xs text-muted-foreground">
                  Terakhir {formatCount(last.followers)} · {formatWib(last.date, "d MMM")}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>

      <CountSuffixChips onPick={appendSuffix} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
