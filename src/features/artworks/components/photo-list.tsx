"use client";

import { useId, useState, useTransition } from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeftRight, ArrowUp, GripVertical, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { updateArtworkImageAlt } from "../actions";
import { ALT_MAX_LENGTH } from "../schema";
import { useAltDrafts } from "./alt-drafts-provider";

export type PhotoItem = {
  id: string;
  storageKey: string;
  width: number;
  height: number;
  alt: string;
  order: number;
  isCover: boolean;
  isProcess: boolean;
};

export type PhotoHandlers = {
  /** Urutan baru untuk satu kelompok (foto karya jadi atau foto proses). */
  onReorder: (group: PhotoItem[]) => void;
  onSetCover: (photo: PhotoItem) => void;
  onToggleProcess: (photo: PhotoItem) => void;
  onDelete: (photo: PhotoItem) => void;
  onAltSaved: (photo: PhotoItem, alt: string) => void;
  busy: boolean;
};

const announcements: Announcements = {
  onDragStart: ({ active }) => `Mengangkat foto ${Number(active.data.current?.index ?? 0) + 1}.`,
  onDragOver: ({ over }) => (over ? `Di posisi ${Number(over.data.current?.index ?? 0) + 1}.` : "Di luar daftar."),
  onDragEnd: ({ over }) =>
    over ? `Foto dilepas di posisi ${Number(over.data.current?.index ?? 0) + 1}.` : "Foto dilepas, urutan tidak berubah.",
  onDragCancel: () => "Batal mengurutkan foto.",
};

const screenReaderInstructions = {
  draggable:
    "Tekan spasi atau Enter untuk mengangkat foto, panah atas/bawah untuk memindah, spasi atau Enter untuk melepas, Escape untuk batal.",
};

/** Daftar foto satu kelompok: seret (dnd-kit) atau tombol naik/turun untuk keyboard dan HP. */
export function PhotoList({
  photos,
  title,
  handlers,
}: {
  photos: PhotoItem[];
  title: string;
  handlers: PhotoHandlers;
}) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    handlers.onReorder(arrayMove(photos, from, to));
  }

  function onDragEnd(event: DragEndEvent) {
    const from = photos.findIndex((p) => p.id === event.active.id);
    const to = photos.findIndex((p) => p.id === event.over?.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ol className="grid gap-2" aria-label={title}>
          {photos.map((photo, index) => (
            <SortablePhoto
              key={photo.id}
              photo={photo}
              index={index}
              total={photos.length}
              onMove={move}
              handlers={handlers}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortablePhoto({
  photo,
  index,
  total,
  onMove,
  handlers,
}: {
  photo: PhotoItem;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  handlers: PhotoHandlers;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id, data: { index } });
  const position = index + 1;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex gap-2 rounded-lg border bg-card p-2 sm:gap-3",
        isDragging && "relative z-10 shadow-lg ring-2 ring-ring/40",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
        aria-label={`Seret foto ${position} untuk mengurutkan`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:w-20">
        <Image
          src={routes.media(photo.storageKey)}
          alt={photo.alt}
          fill
          sizes="80px"
          className="object-cover"
        />
        {photo.isCover && (
          <Badge className="absolute bottom-1 left-1 h-4 px-1 text-[10px]">
            <Star aria-hidden />
            Cover
          </Badge>
        )}
      </div>

      <div className="grid min-w-0 flex-1 content-start gap-2">
        <AltInput photo={photo} position={position} onSaved={handlers.onAltSaved} />
        <div className="flex flex-wrap items-center gap-1">
          <IconButton
            label={`Naikkan foto ${position}`}
            disabled={handlers.busy || index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ArrowUp />
          </IconButton>
          <IconButton
            label={`Turunkan foto ${position}`}
            disabled={handlers.busy || index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ArrowDown />
          </IconButton>
          {!photo.isProcess && (
            <IconButton
              label={photo.isCover ? "Foto ini cover" : `Jadikan foto ${position} cover`}
              disabled={handlers.busy || photo.isCover}
              onClick={() => handlers.onSetCover(photo)}
            >
              <Star className={cn(photo.isCover && "fill-current")} />
            </IconButton>
          )}
          <IconButton
            label={photo.isProcess ? "Pindahkan ke foto karya jadi" : "Pindahkan ke foto proses"}
            disabled={handlers.busy}
            onClick={() => handlers.onToggleProcess(photo)}
          >
            <ArrowLeftRight />
          </IconButton>
          <DeletePhotoButton photo={photo} position={position} handlers={handlers} />
        </div>
      </div>
    </li>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function DeletePhotoButton({
  photo,
  position,
  handlers,
}: {
  photo: PhotoItem;
  position: number;
  handlers: PhotoHandlers;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Hapus foto ${position}`}
          title="Hapus foto"
          disabled={handlers.busy}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus foto ini?</AlertDialogTitle>
          <AlertDialogDescription>
            File fotonya ikut dihapus dari server dan tidak bisa dikembalikan.
            {photo.isCover && " Foto karya jadi berikutnya otomatis menjadi cover."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => handlers.onDelete(photo)}>
            Hapus foto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Teks alternatif (wajib untuk terbit), disimpan saat input ditinggalkan atau Enter.
 * Draf dari Bantu AI "Dari foto" tampil di sini dengan penanda "draf AI" dan baru tersimpan lewat Simpan/Enter
 * (meninggalkan input tidak menyimpan draf AI), atau dibuang kembali ke teks tersimpan.
 */
function AltInput({
  photo,
  position,
  onSaved,
}: {
  photo: PhotoItem;
  position: number;
  onSaved: (photo: PhotoItem, alt: string) => void;
}) {
  const { drafts, setDraft, clearDraft } = useAltDrafts();
  const draft = drafts[photo.id];
  const hasDraft = draft !== undefined;
  const [value, setValue] = useState(photo.alt);
  const [savedAlt, setSavedAlt] = useState(photo.alt);
  const [pending, startTransition] = useTransition();
  // Sinkronkan jika data server berubah (mis. setelah router.refresh()).
  if (photo.alt !== savedAlt) {
    setSavedAlt(photo.alt);
    setValue(photo.alt);
  }
  const id = `artwork-image-alt-${photo.id}`;
  const shown = hasDraft ? draft : value;
  const missing = shown.trim() === "";
  const describedBy = [hasDraft && `${id}-draft`, missing && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  function save() {
    if (pending) return;
    const next = shown.trim();
    if (next === photo.alt) {
      if (hasDraft) clearDraft(photo.id); // draf sama dengan teks tersimpan
      if (next !== value) setValue(next);
      return;
    }
    const fromDraft = hasDraft;
    startTransition(async () => {
      const result = await callAction(() => updateArtworkImageAlt({ id: photo.id, alt: next }));
      if (!result.ok) {
        toast.error(result.error);
        // Draf AI dibiarkan supaya bisa dicoba lagi; ketikan biasa kembali ke teks tersimpan.
        if (!fromDraft) setValue(photo.alt);
        return;
      }
      toast.success("Teks alternatif tersimpan");
      setValue(next);
      if (fromDraft) clearDraft(photo.id);
      onSaved(photo, next);
    });
  }

  function discardDraft() {
    clearDraft(photo.id);
    setValue(photo.alt);
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="sr-only">
        Teks alternatif foto {position}
      </label>
      <Input
        id={id}
        value={shown}
        maxLength={ALT_MAX_LENGTH}
        placeholder="Teks alternatif: jelaskan isi foto"
        aria-invalid={missing}
        aria-describedby={describedBy}
        disabled={pending}
        className={cn(hasDraft && "border-primary/60 bg-primary/5 dark:bg-primary/10")}
        onChange={(e) => (hasDraft ? setDraft(photo.id, e.target.value) : setValue(e.target.value))}
        onBlur={hasDraft ? undefined : save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (hasDraft) save();
            else e.currentTarget.blur();
          }
        }}
      />
      {hasDraft && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            <Sparkles aria-hidden />
            draf AI
          </Badge>
          <span id={`${id}-draft`} className="text-xs text-muted-foreground">
            Belum tersimpan.
          </span>
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={discardDraft}>
              Buang
            </Button>
            <Button type="button" variant="secondary" size="xs" disabled={pending} onClick={save}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      )}
      {missing && (
        <p id={`${id}-hint`} className="text-xs text-destructive">
          Wajib diisi sebelum terbit, mis. &quot;Patung naga hijau dilihat dari samping&quot;.
        </p>
      )}
    </div>
  );
}
