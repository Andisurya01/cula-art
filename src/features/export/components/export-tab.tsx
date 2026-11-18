import type { LucideIcon } from "lucide-react";
import { DatabaseBackup, Download, FileBraces, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { CSV_EXPORT_FILES, JSON_EXPORT_FILE, type ExportFileInfo } from "../files";

/**
 * Tab Pengaturan "Ekspor" (E11). Tautan biasa (bukan next/link): Route Handler mengirim file sebagai
 * lampiran, jadi halaman tetap; jika sesi habis, tautan berpindah ke halaman login.
 */
export function ExportTab() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Unduh CSV</CardTitle>
          <CardDescription>
            Satu file per data. Pemisah titik koma (;), UTF-8, waktu WIB, dan desimal koma, jadi
            langsung terbuka rapi di Excel berbahasa Indonesia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {CSV_EXPORT_FILES.map((entry) => (
              <ExportFileRow key={entry.file} entry={entry} icon={FileSpreadsheet} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semua data (JSON)</CardTitle>
          <CardDescription>
            Arsip lengkap untuk disimpan atau diolah program lain. Waktu di dalamnya dalam UTC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul>
            <ExportFileRow entry={JSON_EXPORT_FILE} icon={FileBraces} />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="size-4 text-muted-foreground" aria-hidden />
            Backup database
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>
            Backup harian berjalan otomatis di server (cron pukul 02.30 WIB, disimpan 14 hari,
            terenkripsi, dan disalin ke lokasi lain). Isinya database lengkap dan folder foto
            unggahan. Cara memasang dan menguji pemulihannya ada di{" "}
            <span className="font-mono text-xs">docs/DEPLOY.md</span> bagian Backup harian.
          </p>
          <p>
            Impor atau pulihkan data dari file ekspor tidak tersedia di Studio. Pemulihan dilakukan
            dari backup server.
          </p>
          <p>File ekspor berisi data pribadi (catatan, harga, metrik). Simpan di tempat yang aman.</p>
        </CardContent>
      </Card>
    </>
  );
}

function ExportFileRow({ entry, icon: Icon }: { entry: ExportFileInfo; icon: LucideIcon }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm font-medium">
            {entry.title}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">{entry.file}</span>
          </p>
          <p className="text-sm text-muted-foreground">{entry.description}</p>
        </div>
      </div>
      {/* ml-7 = ikon (16 px) + jarak (12 px): di HP tombol sejajar dengan teks di atasnya. */}
      <Button asChild variant="outline" size="sm" className="ml-7 self-start sm:ml-0 sm:self-center">
        <a href={routes.studio.exportFile(entry.file)} aria-label={`Unduh ${entry.title} (${entry.file})`}>
          <Download aria-hidden />
          Unduh
        </a>
      </Button>
    </li>
  );
}
