"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
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
import { engagementRate } from "@/lib/analytics/metrics";
import type { MetricKind } from "@/lib/analytics/snapshots";
import { PLATFORM_LABELS, VIEWS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { saveMetricSnapshot } from "../actions";
import { formatPercent } from "../format";
import { parseCount, withCountSuffix } from "../parse-count";
import {
  METRIC_KINDS,
  METRIC_KIND_LABELS,
  metricValuesSchema,
  metricWarnings,
  type MetricFormValues,
  type MetricValues,
} from "../schema";
import { CountSuffixChips } from "./count-suffix-chips";

export type MetricFormPost = {
  id: string;
  title: string;
  platform: Platform;
};

/** Snapshot yang sudah ada, untuk mengisi form saat mengubah. */
export type MetricFormSnapshot = {
  kind: "H1" | "H7" | "CUSTOM";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
  avgWatchSec: number | null;
  completionRate: number | null;
};

type FieldName = keyof MetricFormValues;

const EMPTY_VALUES: MetricFormValues = {
  views: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  follows: "",
  avgWatchSec: "",
  completionRate: "",
};

const COUNT_FIELDS: FieldName[] = ["views", "likes", "comments", "shares", "saves", "follows"];

/**
 * Enter pindah ke field berikutnya; hanya field terakhir yang terlihat yang menyimpan. Field kosong
 * berarti 0, jadi Enter setelah Views tidak boleh menyimpan form yang baru terisi satu angka.
 */
function focusNextOnEnter(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
  const inputs = [...event.currentTarget.querySelectorAll("input")].filter(
    (input) => !input.closest("details:not([open])"),
  );
  const next = inputs[inputs.indexOf(event.target) + 1];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

function toDefaults(snapshot: MetricFormSnapshot | undefined): MetricFormValues {
  if (!snapshot) return EMPTY_VALUES;
  return {
    views: String(snapshot.views),
    likes: String(snapshot.likes),
    comments: String(snapshot.comments),
    shares: String(snapshot.shares),
    saves: String(snapshot.saves),
    follows: String(snapshot.follows),
    avgWatchSec: snapshot.avgWatchSec === null ? "" : String(snapshot.avgWatchSec).replace(".", ","),
    completionRate: snapshot.completionRate === null ? "" : String(snapshot.completionRate).replace(".", ","),
  };
}

/** Isi kosong dihitung 0, sama dengan schema. Angka tidak terbaca → `null` (pratinjau ER disembunyikan). */
function previewCount(value: unknown): number | null {
  const text = typeof value === "string" ? value : "";
  return text.trim() === "" ? 0 : parseCount(text);
}

/**
 * Tombol + dialog form metrik. Isi form dibuat saat dialog dibuka, jadi aman dipakai di setiap baris
 * daftar. `kind` = jenis yang dibuka lebih dulu (H+1 atau H+7); bisa diganti di dalam dialog.
 */
export function MetricFormButton({
  post,
  kind,
  snapshots = [],
  children,
  className,
  variant = "outline",
  size = "sm",
  ...aria
}: {
  post: MetricFormPost;
  kind: MetricKind;
  snapshots?: readonly MetricFormSnapshot[];
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)} {...aria}>
        {children}
      </Button>
      <MetricFormDialog open={open} onOpenChange={setOpen} post={post} kind={kind} snapshots={snapshots} />
    </>
  );
}

/** Dialog form metrik terkendali, untuk tempat yang punya pemicu sendiri. */
export function MetricFormDialog({
  open,
  onOpenChange,
  post,
  kind,
  snapshots = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: MetricFormPost;
  kind: MetricKind;
  snapshots?: readonly MetricFormSnapshot[];
}) {
  // Selama menyimpan, dialog tidak boleh ditutup.
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        {open && (
          <MetricForm
            post={post}
            initialKind={kind}
            snapshots={snapshots}
            onBusyChange={setBusy}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricForm({
  post,
  initialKind,
  snapshots,
  onBusyChange,
  onDone,
}: {
  post: MetricFormPost;
  initialKind: MetricKind;
  snapshots: readonly MetricFormSnapshot[];
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<MetricKind>(initialKind);
  const existing = snapshots.find((s) => s.kind === kind);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{existing ? "Ubah" : "Isi"} metrik {METRIC_KIND_LABELS[kind]}</DialogTitle>
        <DialogDescription className="flex items-start gap-2">
          <PlatformBadge platform={post.platform} className="mt-0.5" />
          <span className="min-w-0 break-words">{post.title}</span>
        </DialogDescription>
      </DialogHeader>

      <div role="group" aria-label="Jenis snapshot" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {METRIC_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
            className={cn(
              "rounded-md px-2 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              kind === option ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {METRIC_KIND_LABELS[option]}
            {snapshots.some((s) => s.kind === option) && <span className="sr-only"> (sudah diisi)</span>}
            {snapshots.some((s) => s.kind === option) && <span aria-hidden> ✓</span>}
          </button>
        ))}
      </div>

      {/* Ganti jenis = form baru dengan isi jenis itu, supaya angka H+1 tidak tersimpan sebagai H+7. */}
      <MetricFields key={kind} post={post} kind={kind} existing={existing} onBusyChange={onBusyChange} onDone={onDone} />
    </>
  );
}

function MetricFields({
  post,
  kind,
  existing,
  onBusyChange,
  onDone,
}: {
  post: MetricFormPost;
  kind: MetricKind;
  existing: MetricFormSnapshot | undefined;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeField, setActiveField] = useState<FieldName>("views");
  const [defaults] = useState(() => toDefaults(existing));
  const form = useForm<MetricFormValues, unknown, MetricValues>({
    resolver: zodResolver(metricValuesSchema),
    defaultValues: defaults,
  });
  const values = useWatch({ control: form.control });
  const viewsLabel = VIEWS_LABELS[post.platform];
  const { errors } = form.formState;
  const [optionalOpen, setOptionalOpen] = useState(
    existing?.avgWatchSec != null || existing?.completionRate != null,
  );
  // Error di field opsional tidak boleh tersembunyi di bagian yang terlipat.
  const showOptional = optionalOpen || !!errors.avgWatchSec || !!errors.completionRate;

  const { setFocus } = form;
  useEffect(() => {
    setFocus("views");
  }, [setFocus]);

  const views = previewCount(values.views);
  const likes = previewCount(values.likes);
  const comments = previewCount(values.comments);
  const shares = previewCount(values.shares);
  const saves = previewCount(values.saves);
  const follows = previewCount(values.follows);
  const hasViews = typeof values.views === "string" && values.views.trim() !== "";
  const er =
    hasViews && views !== null && likes !== null && comments !== null && shares !== null && saves !== null && follows !== null
      ? engagementRate({ views, likes, comments, shares, saves, follows })
      : null;
  const warnings = hasViews ? metricWarnings({ views, likes }, viewsLabel) : [];

  const onSubmit = form.handleSubmit((parsed) => {
    onBusyChange(true);
    startTransition(async () => {
      const result = await callAction(() => saveMetricSnapshot({ postId: post.id, kind, ...parsed }));
      onBusyChange(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Metrik ${METRIC_KIND_LABELS[kind]} ${PLATFORM_LABELS[post.platform]} tersimpan · ER ${formatPercent(engagementRate(parsed))}`,
      );
      onDone();
      router.refresh();
    });
  });

  /** Tambahkan akhiran ke field yang sedang aktif tanpa menutup keyboard HP. */
  function appendSuffix(suffix: string) {
    const current = form.getValues(activeField);
    const next = withCountSuffix(typeof current === "string" ? current : "", suffix);
    if (next === "") return;
    form.setValue(activeField, next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
    form.setFocus(activeField);
  }

  const countField = (name: FieldName, label: string, placeholder?: string, enterKeyHint: "next" | "done" = "next") => (
    <MetricInput
      key={name}
      form={form}
      name={name}
      label={label}
      placeholder={placeholder}
      inputMode="numeric"
      enterKeyHint={enterKeyHint}
      onFocus={() => setActiveField(name)}
    />
  );

  return (
    <form onSubmit={onSubmit} onKeyDown={focusNextOnEnter} className="grid gap-3" noValidate>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {countField("views", viewsLabel, "12,3K")}
        {countField("likes", "Likes", "0")}
        {countField("comments", "Komentar", "0")}
        {countField("shares", "Shares", "0")}
        {countField("saves", "Saves", "0")}
        {countField("follows", "Followers dari post", "0", showOptional ? "next" : "done")}
      </div>

      <CountSuffixChips disabled={!COUNT_FIELDS.includes(activeField)} onPick={appendSuffix} />

      <details open={showOptional} onToggle={(event) => setOptionalOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Waktu tonton dan completion rate (opsional)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
          <MetricInput
            form={form}
            name="avgWatchSec"
            label="Rata-rata tonton (detik)"
            placeholder="8,3"
            inputMode="decimal"
            enterKeyHint="next"
            onFocus={() => setActiveField("avgWatchSec")}
          />
          <MetricInput
            form={form}
            name="completionRate"
            label="Completion rate (%)"
            placeholder="45,5"
            inputMode="decimal"
            enterKeyHint="done"
            onFocus={() => setActiveField("completionRate")}
          />
        </div>
      </details>

      <div className="grid gap-1 text-xs" aria-live="polite">
        <p className="text-muted-foreground">
          ER: <span className="font-medium text-foreground tabular-nums">{er === null ? "—" : formatPercent(er)}</span>
        </p>
        {warnings.map((warning) => (
          <p key={warning} className="text-amber-700 dark:text-amber-300">
            {warning}
          </p>
        ))}
      </div>

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

function MetricInput({
  form,
  name,
  label,
  placeholder,
  inputMode,
  enterKeyHint,
  onFocus,
}: {
  form: UseFormReturn<MetricFormValues, unknown, MetricValues>;
  name: FieldName;
  label: string;
  placeholder?: string;
  inputMode: "numeric" | "decimal";
  enterKeyHint: "next" | "done";
  onFocus: () => void;
}) {
  const id = `metric-${name}`;
  const error = form.formState.errors[name]?.message;
  return (
    <div className="grid content-start gap-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        enterKeyHint={enterKeyHint}
        placeholder={placeholder}
        aria-invalid={!!error}
        onFocus={onFocus}
        {...form.register(name)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
