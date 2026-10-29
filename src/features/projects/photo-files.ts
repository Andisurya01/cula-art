import "server-only";
import { db } from "@/lib/db";
import { deleteFilesQuietly } from "@/lib/storage";

/**
 * Hapus file foto progres unggahan SETELAH barisnya terhapus dari DB. Key yang masih dipakai foto
 * karya dilewati (jaga-jaga jika Jadikan Karya memakai file yang sama), supaya foto di Galeri tidak
 * hilang. Jika pemeriksaan gagal, file dibiarkan (lebih baik yatim daripada salah hapus).
 */
export async function deleteProjectPhotoFiles(keys: (string | null | undefined)[]): Promise<void> {
  const candidates = [...new Set(keys.filter((k): k is string => !!k))];
  if (candidates.length === 0) return;

  let used: Set<string>;
  try {
    const rows = await db.artworkImage.findMany({
      where: { storageKey: { in: candidates } },
      select: { storageKey: true },
    });
    used = new Set(rows.map((r) => r.storageKey));
  } catch (error) {
    console.error("Gagal memeriksa pemakaian file foto progres", error);
    return;
  }

  await deleteFilesQuietly(candidates.filter((k) => !used.has(k)));
}
