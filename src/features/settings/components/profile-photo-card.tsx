"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2, UserRound } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { MAX_UPLOAD_MB, uploadWithProgress } from "@/lib/upload-client";
import { removeProfilePhoto } from "../actions";
import { useRunAction } from "./use-run-action";

/** Route Handler unggah foto profil (`src/app/studio/(app)/pengaturan/foto-profil/route.ts`). */
const UPLOAD_URL = routes.studio.settingsProfilePhoto;
/** Sama dengan IMAGE_ACCEPT di src/lib/images.ts (modul server). */
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

/** Foto profil Galeri: unggah/ganti dengan progres, atau hapus. Tersimpan langsung tanpa tombol Simpan. */
export function ProfilePhotoCard({ avatarKey }: { avatarKey: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const { pending: removing, run } = useRunAction();
  const uploading = progress !== null;
  const busy = uploading || refreshing || removing;

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // supaya file yang sama bisa dipilih lagi
    if (!file) return;

    setProgress(0);
    const result = await uploadWithProgress<{ avatarKey: string }>(UPLOAD_URL, file, {
      onProgress: setProgress,
    });
    setProgress(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(avatarKey ? "Foto profil diganti" : "Foto profil diunggah");
    startRefresh(() => router.refresh());
  }

  function onRemove() {
    run(() => removeProfilePhoto(), { success: "Foto profil dihapus" });
  }

  const percent = Math.round((progress ?? 0) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto profil</CardTitle>
        <CardDescription>
          Tampil bulat di Beranda dan halaman Tentang. JPG, PNG, atau WebP, maks. {MAX_UPLOAD_MB} MB.
          Lokasi dan data kamera dihapus otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full border bg-muted">
          {avatarKey ? (
            <Image
              src={routes.media(avatarKey)}
              alt="Foto profil"
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <UserRound className="absolute inset-0 m-auto size-10 text-muted-foreground" aria-hidden />
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/60">
              <Loader2 className="size-6 animate-spin text-foreground" aria-hidden />
            </div>
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              <ImageUp />
              {avatarKey ? "Ganti foto" : "Unggah foto"}
            </Button>
            {avatarKey && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
              >
                <Trash2 />
                Hapus
              </Button>
            )}
          </div>

          {uploading && (
            <div className="grid gap-1.5">
              <div
                role="progressbar"
                aria-label="Progres unggah foto profil"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {percent < 100 ? `Mengunggah… ${percent}%` : "Memproses foto…"}
              </p>
            </div>
          )}
          {!uploading && (
            <p className="text-xs text-muted-foreground">
              Pakai foto persegi dengan wajah atau karya di tengah supaya bagus saat dipotong bulat.
            </p>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus foto profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto dihapus dari Galeri dan dari penyimpanan. Kamu bisa mengunggah foto baru kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
