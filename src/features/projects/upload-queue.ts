// Fungsi murni antrean unggah foto progres (dialog Tambah foto → Unggah).

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export type QueueEntry = { status: UploadStatus; error?: string };

/** File yang masih perlu dikirim: belum dicoba, atau gagal (dicoba ulang). */
export function needsUpload(entry: QueueEntry): boolean {
  return entry.status === "pending" || entry.status === "error";
}

export type UploadSummary = { done: number; failed: number; waiting: number };

export function summarizeQueue(entries: QueueEntry[]): UploadSummary {
  let done = 0;
  let failed = 0;
  let waiting = 0;
  for (const entry of entries) {
    if (entry.status === "done") done++;
    else if (entry.status === "error") failed++;
    else waiting++;
  }
  return { done, failed, waiting };
}

/** Pesan toast setelah satu putaran unggah. `null` jika tidak ada yang dicoba. */
export function uploadResultMessage(
  summary: { done: number; failed: number },
  firstError?: string,
): { kind: "success" | "error"; text: string } | null {
  const { done, failed } = summary;
  if (done === 0 && failed === 0) return null;
  if (failed === 0) {
    return { kind: "success", text: done === 1 ? "Foto progres diunggah" : `${done} foto progres diunggah` };
  }
  if (done === 0) {
    return {
      kind: "error",
      text: failed === 1 && firstError ? firstError : `${failed} foto gagal diunggah`,
    };
  }
  return { kind: "error", text: `${done} foto diunggah, ${failed} gagal` };
}

/** Ukuran file ringkas dalam format Indonesia, mis. "850 KB", "2,4 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("id-ID", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}
