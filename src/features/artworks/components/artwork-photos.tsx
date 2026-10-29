"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { callAction } from "@/lib/action-client";
import type { ActionResult } from "@/lib/action";
import { routes } from "@/lib/routes";
import { MAX_UPLOAD_MB, uploadWithProgress } from "@/lib/upload-client";
import {
  deleteArtworkImage,
  reorderArtworkImages,
  setArtworkCover,
  setArtworkImageProcess,
} from "../actions";
import { PhotoList, type PhotoHandlers, type PhotoItem } from "./photo-list";

// Sama dengan IMAGE_ACCEPT di src/lib/images.ts (modul server-only, jadi tidak diimpor di client).
const ACCEPT = "image/jpeg,image/png,image/webp";

type Upload = {
  key: number;
  name: string;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

function byOrder(a: PhotoItem, b: PhotoItem) {
  return a.order - b.order;
}

/** Foto karya: unggah banyak file (progres per file), urutkan, cover, teks alternatif, foto proses, hapus. */
export function ArtworkPhotos({ artworkId, images }: { artworkId: string; images: PhotoItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(images);
  const [serverImages, setServerImages] = useState(images);
  // Data server baru (router.refresh()) menggantikan state lokal/optimistis.
  if (images !== serverImages) {
    setServerImages(images);
    setItems(images);
  }
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const finishedInput = useRef<HTMLInputElement>(null);
  const processInput = useRef<HTMLInputElement>(null);
  const uploadKey = useRef(0);

  const sorted = [...items].sort(byOrder);
  const finished = sorted.filter((p) => !p.isProcess);
  const process = sorted.filter((p) => p.isProcess);
  const busy = pending || uploading;

  function run(action: () => Promise<ActionResult>, success?: string, optimistic?: () => void) {
    optimistic?.(); // di luar transition supaya langsung tampil
    startTransition(async () => {
      const result = await callAction(action);
      if (!result.ok) {
        toast.error(result.error);
        setItems(images);
      } else if (success) {
        toast.success(success);
      }
      router.refresh();
    });
  }

  const handlers: PhotoHandlers = {
    busy,
    onReorder(group) {
      const groupIsProcess = group[0]?.isProcess ?? false;
      const next = groupIsProcess ? [...finished, ...group] : [...group, ...process];
      const ordered = next.map((p, order) => ({ ...p, order }));
      run(
        () => reorderArtworkImages({ artworkId, imageIds: ordered.map((p) => p.id) }),
        undefined,
        () => setItems(ordered),
      );
    },
    onSetCover(photo) {
      run(() => setArtworkCover(photo.id), "Cover diganti", () =>
        setItems((prev) => {
          const others = [...prev].sort(byOrder).filter((p) => p.id !== photo.id);
          const finishedOthers = others.filter((p) => !p.isProcess);
          const processOthers = others.filter((p) => p.isProcess);
          return [{ ...photo, isCover: true }, ...finishedOthers, ...processOthers].map((p, order) => ({
            ...p,
            order,
            isCover: p.id === photo.id,
          }));
        }),
      );
    },
    onToggleProcess(photo) {
      run(
        () => setArtworkImageProcess({ id: photo.id, isProcess: !photo.isProcess }),
        photo.isProcess ? "Dipindah ke foto karya jadi" : "Dipindah ke foto proses",
      );
    },
    onDelete(photo) {
      run(() => deleteArtworkImage(photo.id), "Foto dihapus", () =>
        setItems((prev) => prev.filter((p) => p.id !== photo.id)),
      );
    },
    onAltSaved(photo, alt) {
      setItems((prev) => prev.map((p) => (p.id === photo.id ? { ...p, alt } : p)));
      router.refresh();
    },
  };

  function updateUpload(key: number, patch: Partial<Upload>) {
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }

  async function uploadFiles(files: File[], isProcess: boolean) {
    if (files.length === 0) return;
    const batch: Upload[] = files.map((file) => ({
      key: ++uploadKey.current,
      name: file.name,
      progress: 0,
      status: "waiting",
    }));
    setUploads((prev) => [...prev.filter((u) => u.status === "error"), ...batch]);
    setUploading(true);

    let succeeded = 0;
    for (const [i, file] of files.entries()) {
      const { key } = batch[i];
      updateUpload(key, { status: "uploading" });
      const result = await uploadWithProgress<PhotoItem>(routes.studio.artworkPhotoUpload(artworkId), file, {
        fields: isProcess ? { isProcess: "1" } : {},
        onProgress: (fraction) => updateUpload(key, { progress: fraction }),
      });
      if (result.ok) {
        succeeded++;
        updateUpload(key, { status: "done", progress: 1 });
        setItems((prev) => [...prev, result.data]);
      } else {
        updateUpload(key, { status: "error", error: result.error });
      }
    }

    setUploading(false);
    setUploads((prev) => prev.filter((u) => u.status !== "done"));
    if (succeeded > 0) {
      toast.success(`${succeeded} foto diunggah. Jangan lupa isi teks alternatifnya.`);
      router.refresh();
    }
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>, isProcess: boolean) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // supaya file yang sama bisa dipilih lagi
    void uploadFiles(files, isProcess);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto</CardTitle>
        <CardDescription>
          JPG, PNG, atau WebP, maks. {MAX_UPLOAD_MB} MB per file. Foto dikecilkan dan metadata lokasi (EXIF/GPS)
          dihapus otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => finishedInput.current?.click()}>
            <ImagePlus />
            Unggah foto karya
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => processInput.current?.click()}>
            <ImagePlus />
            Unggah foto proses
          </Button>
          <input
            ref={finishedInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => onPick(e, false)}
          />
          <input
            ref={processInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => onPick(e, true)}
          />
        </div>

        {uploads.length > 0 && (
          <UploadQueue
            uploads={uploads}
            onDismiss={(key) => setUploads((prev) => prev.filter((u) => u.key !== key))}
          />
        )}

        <section className="grid gap-2">
          <div>
            <h3 className="text-sm font-medium">Foto karya jadi ({finished.length})</h3>
            <p className="text-xs text-muted-foreground">
              Cover (bintang) tampil pertama di Galeri dan di kartu katalog. Seret atau pakai tombol panah untuk
              mengurutkan.
            </p>
          </div>
          {finished.length > 0 ? (
            <PhotoList photos={finished} title="Foto karya jadi" handlers={handlers} />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada foto karya jadi. Minimal 1 foto dibutuhkan untuk terbit.
            </p>
          )}
        </section>

        <section className="grid gap-2">
          <div>
            <h3 className="text-sm font-medium">Foto proses ({process.length})</h3>
            <p className="text-xs text-muted-foreground">
              Tampil di bagian Proses pada halaman karya. Tidak bisa menjadi cover.
            </p>
          </div>
          {process.length > 0 ? (
            <PhotoList photos={process} title="Foto proses" handlers={handlers} />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada foto proses (opsional).
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function UploadQueue({ uploads, onDismiss }: { uploads: Upload[]; onDismiss: (key: number) => void }) {
  return (
    <ul className="grid gap-2" aria-label="Antrean unggahan" aria-live="polite">
      {uploads.map((u) => (
        <li key={u.key} className="grid gap-1.5 rounded-lg border p-2 text-sm">
          <div className="flex items-center gap-2">
            {u.status === "error" ? (
              <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
            ) : u.status === "done" ? (
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Loader2
                className={u.status === "uploading" ? "size-4 shrink-0 animate-spin" : "size-4 shrink-0 opacity-40"}
                aria-hidden
              />
            )}
            <span className="min-w-0 flex-1 truncate">{u.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {u.status === "waiting"
                ? "Menunggu"
                : u.status === "error"
                  ? "Gagal"
                  : u.status === "done"
                    ? "Selesai"
                    : u.progress >= 1
                      ? "Memproses…"
                      : `${Math.round(u.progress * 100)}%`}
            </span>
            {u.status === "error" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Tutup pesan gagal ${u.name}`}
                onClick={() => onDismiss(u.key)}
              >
                <X />
              </Button>
            )}
          </div>
          {u.status === "error" ? (
            <p className="text-xs text-destructive">{u.error}</p>
          ) : (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`Progres ${u.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(u.progress * 100)}
            >
              <div className="h-full bg-primary transition-[width]" style={{ width: `${u.progress * 100}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
