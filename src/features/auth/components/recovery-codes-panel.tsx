"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Daftar 10 kode pemulihan + salin / unduh .txt. Dipakai saat setup 2FA dan buat ulang kode. */
export function RecoveryCodesPanel({ codes }: { codes: string[] }) {
  const text = [
    "Kode pemulihan Studio Karya",
    "Setiap kode hanya bisa dipakai sekali.",
    "",
    ...codes,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Kode disalin");
    } catch {
      toast.error("Gagal menyalin. Pilih teks kode lalu salin manual.");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kode-pemulihan-studio.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3 font-mono text-sm select-all">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy />
          Salin
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download />
          Unduh .txt
        </Button>
      </div>
    </div>
  );
}
