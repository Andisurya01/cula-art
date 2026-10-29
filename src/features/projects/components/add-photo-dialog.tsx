"use client";

import { useState } from "react";
import { ImagePlus, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoUploadForm } from "./photo-upload-form";
import { PhotoUrlForm } from "./photo-url-form";

/**
 * Tambah foto progres: unggah file (beberapa sekaligus) atau tautan URL (Fase 1).
 * Dialog tidak bisa ditutup selama unggahan berjalan (pakai tombol Batalkan).
 */
export function AddPhotoDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    if (!next && busy) return;
    setOpen(next);
  }

  const close = () => {
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus />
          Tambah foto
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>Foto progres</DialogTitle>
          <DialogDescription>
            Foto unggahan dikecilkan dan metadatanya (termasuk lokasi GPS) dihapus sebelum disimpan.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" disabled={busy}>
              <Upload />
              Unggah
            </TabsTrigger>
            <TabsTrigger value="url" disabled={busy}>
              <Link2 />
              Tautan URL
            </TabsTrigger>
          </TabsList>
          {/* forceMount: antrean unggah tidak hilang saat pindah tab. */}
          <TabsContent value="upload" forceMount className="pt-2 data-[state=inactive]:hidden">
            <PhotoUploadForm projectId={projectId} onDone={close} onBusyChange={setBusy} />
          </TabsContent>
          <TabsContent value="url" forceMount className="pt-2 data-[state=inactive]:hidden">
            <PhotoUrlForm projectId={projectId} onDone={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
