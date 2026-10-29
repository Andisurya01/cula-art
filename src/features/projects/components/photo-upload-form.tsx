"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, ImageIcon, ImageUp, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toWibDateString } from "@/lib/date";
import { uploadWithProgress } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { projectPhotoUploadUrl } from "../photo";
import { PHOTO_CAPTION_MAX, projectPhotoUploadSchema } from "../schema";
import {
  formatFileSize,
  needsUpload,
  summarizeQueue,
  uploadResultMessage,
  type QueueEntry,
} from "../upload-queue";
import { FieldError } from "./chip-button";

/** Sama dengan IMAGE_ACCEPT di src/lib/images.ts (modul itu khusus server). */
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

type QueueItem = QueueEntry & {
  id: number;
  file: File;
  previewUrl: string;
  caption: string;
  progress: number;
};

/**
 * Unggah beberapa foto progres sekaligus, berurutan, dengan progres per file. Caption per foto,
 * tanggal satu untuk semua (opsional). File yang gagal tetap di daftar dan bisa dicoba lagi.
 */
export function PhotoUploadForm({
  projectId,
  onDone,
  onBusyChange,
}: {
  projectId: string;
  onDone: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [takenAt, setTakenAt] = useState(() => toWibDateString(new Date()));
  const [dateError, setDateError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const router = useRouter();

  // Lepas object URL pratinjau dan hentikan unggahan saat dialog ditutup (komponen dilepas).
  const itemsRef = useRef<QueueItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      abortRef.current?.abort();
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );

  const summary = summarizeQueue(items);
  const toUpload = items.filter(needsUpload).length;

  function patch(id: number, changes: Partial<QueueItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: QueueItem[] = Array.from(files).map((file) => ({
      id: nextId.current++,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      status: "pending",
      progress: 0,
    }));
    setItems((prev) => [...prev, ...added]);
    // Supaya memilih file yang sama lagi tetap memicu onChange.
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(item: QueueItem) {
    URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function setBusy(busy: boolean) {
    setUploading(busy);
    onBusyChange(busy);
  }

  async function onUpload() {
    const fields = projectPhotoUploadSchema.shape.takenAt.safeParse(takenAt);
    if (!fields.success) {
      setDateError(fields.error.issues[0]?.message);
      return;
    }
    setDateError(undefined);
    const queue = items.filter(needsUpload);
    if (queue.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    const url = projectPhotoUploadUrl(projectId);
    let done = 0;
    let failed = 0;
    let firstError: string | undefined;

    for (const item of queue) {
      if (controller.signal.aborted) break;
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      const result = await uploadWithProgress<{ id: string }>(url, item.file, {
        fields: { caption: item.caption.trim(), takenAt },
        onProgress: (fraction) => patch(item.id, { progress: fraction }),
        signal: controller.signal,
      });
      if (result.ok) {
        done++;
        patch(item.id, { status: "done", progress: 1 });
      } else {
        failed++;
        firstError ??= result.error;
        patch(item.id, { status: "error", progress: 0, error: result.error });
      }
    }

    abortRef.current = null;
    setBusy(false);
    if (done > 0) router.refresh();

    if (controller.signal.aborted) {
      toast.message(done > 0 ? `${done} foto diunggah, sisanya dibatalkan` : "Unggahan dibatalkan");
      return;
    }
    const message = uploadResultMessage({ done, failed }, firstError);
    if (!message) return;
    if (message.kind === "success") {
      toast.success(message.text);
      onDone();
    } else {
      toast.error(message.text);
    }
  }

  return (
    <div className="grid gap-4">
      <label
        htmlFor="photo-files"
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={(event) => {
          // Pindah ke elemen anak juga memicu dragleave; abaikan selama masih di dalam area.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!uploading) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
          dragOver && "border-primary bg-muted/40",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <ImageUp className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">Pilih foto</span>
        <span className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maks. 15 MB per file. Bisa beberapa sekaligus.
        </span>
        <input
          ref={inputRef}
          id="photo-files"
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={uploading}
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </label>

      {items.length > 0 && (
        <ul className="grid gap-2" aria-label="Foto yang akan diunggah">
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              locked={uploading}
              onCaptionChange={(caption) => patch(item.id, { caption })}
              onRemove={() => removeItem(item)}
            />
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <Label htmlFor="photo-upload-date">Tanggal foto (opsional, untuk semua foto)</Label>
        <Input
          id="photo-upload-date"
          type="date"
          value={takenAt}
          disabled={uploading}
          aria-invalid={!!dateError}
          onChange={(event) => setTakenAt(event.target.value)}
        />
        <FieldError message={dateError} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {items.length === 0
            ? "Belum ada foto dipilih"
            : `${items.length} foto · ${summary.done} selesai${summary.failed ? ` · ${summary.failed} gagal` : ""}`}
        </p>
        {uploading ? (
          <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
            Batalkan
          </Button>
        ) : (
          <Button type="button" onClick={onUpload} disabled={toUpload === 0}>
            {summary.failed > 0 && toUpload === summary.failed
              ? `Coba lagi (${toUpload})`
              : toUpload > 0
                ? `Unggah ${toUpload} foto`
                : "Unggah"}
          </Button>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  item,
  locked,
  onCaptionChange,
  onRemove,
}: {
  item: QueueItem;
  locked: boolean;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
}) {
  const editable = !locked && needsUpload(item);
  const percent = Math.round(item.progress * 100);

  return (
    <li
      className={cn(
        "grid grid-cols-[3.5rem_1fr_auto] gap-x-3 gap-y-1.5 rounded-lg border p-2",
        item.status === "error" && "border-destructive/50",
      )}
    >
      <Thumb src={item.previewUrl} />
      <div className="grid min-w-0 content-start gap-1.5">
        <p className="truncate text-xs font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        <StatusLine item={item} percent={percent} />
        {item.status === "done" ? (
          item.caption.trim() && <p className="truncate text-xs">{item.caption.trim()}</p>
        ) : (
          <Input
            aria-label={`Caption ${item.file.name}`}
            placeholder="Caption (opsional)"
            autoComplete="off"
            maxLength={PHOTO_CAPTION_MAX}
            value={item.caption}
            disabled={!editable}
            onChange={(event) => onCaptionChange(event.target.value)}
            className="h-8 text-sm"
          />
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Hapus ${item.file.name} dari daftar`}
        disabled={locked}
        onClick={onRemove}
        className="text-muted-foreground"
      >
        <X />
      </Button>
      {item.status === "uploading" && (
        <div
          className="col-span-3 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Progres ${item.file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  );
}

function StatusLine({ item, percent }: { item: QueueItem; percent: number }) {
  const size = formatFileSize(item.file.size);
  switch (item.status) {
    case "uploading":
      return (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <LoaderCircle className="size-3 animate-spin" aria-hidden />
          {percent >= 100 ? "Memproses…" : `Mengunggah ${percent}%`}
        </p>
      );
    case "done":
      return (
        <p className="flex items-center gap-1 text-[11px] text-primary">
          <CircleCheck className="size-3" aria-hidden />
          Selesai
        </p>
      );
    case "error":
      return (
        <p className="flex items-start gap-1 text-[11px] text-destructive">
          <CircleAlert className="mt-px size-3 shrink-0" aria-hidden />
          <span>{item.error ?? "Gagal diunggah"}</span>
        </p>
      );
    default:
      return <p className="text-[11px] text-muted-foreground">{size}</p>;
  }
}

/** Pratinjau lokal (object URL). Foto yang tidak bisa ditampilkan browser (mis. HEIC) → ikon. */
function Thumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative size-14 overflow-hidden rounded-md bg-muted">
      {failed ? (
        <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
