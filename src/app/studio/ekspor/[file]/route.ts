// Ekspor data Studio (GET, E11 di docs/FASE-5.md): CSV untuk Excel berlocale Indonesia dan JSON lengkap
// tanpa tabel auth. Hanya nama file di EXPORT_FILES; selain itu 404. Tidak pernah di-cache.

import { requireAdmin } from "@/features/auth/dal";
import { exportContentType, exportFileName, isExportFile } from "@/features/export/files";
import { renderExportFile } from "@/features/export/render";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  await requireAdmin();
  const { file } = await params;
  if (!isExportFile(file)) {
    return new Response("Tidak ditemukan", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const now = new Date();
  const body = await renderExportFile(file, now);
  return new Response(body, {
    headers: {
      "Content-Type": exportContentType(file),
      "Content-Disposition": `attachment; filename="${exportFileName(file, now)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
