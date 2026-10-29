"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** Error boundary untuk semua menu: sidebar & bottom nav tetap tampil, isi halaman bisa dicoba lagi. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Halaman gagal dimuat"
      description="Terjadi kesalahan saat memuat data. Periksa koneksi, lalu coba lagi."
      action={<Button onClick={() => retry()}>Coba lagi</Button>}
    />
  );
}
