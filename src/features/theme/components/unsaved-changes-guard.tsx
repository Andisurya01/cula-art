"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { guardedDestination } from "../editor-navigation";

/**
 * Peringatan saat meninggalkan halaman dengan perubahan belum tersimpan:
 * - tutup tab / muat ulang / tautan luar → dialog bawaan browser (`beforeunload`);
 * - klik tautan internal (sidebar, bottom nav, dll.) → dialog konfirmasi, lalu `router.push`.
 * Klik dicegat di fase capture pada `document`, sebelum handler `<Link>`; `preventDefault` cukup
 * (Link melewati navigasi jika event sudah dicegah), jadi handler lain (mis. menutup Sheet) tetap jalan.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!when) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Browser lama baru menampilkan dialog jika returnValue diisi.
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const next = guardedDestination(
        {
          href: anchor.getAttribute("href"),
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
          button: event.button,
          modifier: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
          defaultPrevented: event.defaultPrevented,
        },
        new URL(window.location.href),
      );
      if (!next) return;
      event.preventDefault();
      setDestination(next);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [when]);

  return (
    <AlertDialog open={destination !== null} onOpenChange={(open) => !open && setDestination(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tinggalkan halaman ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Perubahan tampilan belum disimpan dan akan hilang jika kamu pindah halaman.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tetap di sini</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (destination) router.push(destination);
              setDestination(null);
            }}
          >
            Tinggalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
