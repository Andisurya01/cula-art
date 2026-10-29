/** Catatan bahwa kolom Posted hanya menampilkan konten terbaru. */
export function PostedLimitNote({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
      Menampilkan {shown} terbaru dari {total} konten Posted.
    </p>
  );
}
