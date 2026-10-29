// Unggah satu foto karya (multipart, field `file`; opsional `isProcess=1` untuk foto proses).
// Server Action dibatasi 1 MB, jadi unggahan lewat Route Handler + XHR (progres per file).

import { requireAdmin } from "@/features/auth/dal";
import { MAX_ARTWORK_IMAGES } from "@/features/artworks/schema";
import { revalidateArtwork, syncCover } from "@/features/artworks/service";
import { db } from "@/lib/db";
import { discardStoredImage } from "@/lib/images";
import { jsonResult, receiveImageUpload, uploadError } from "@/lib/upload-route";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const artwork = await db.artwork.findUnique({
    where: { id },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!artwork) return uploadError("Karya tidak ditemukan.", 404);
  if (artwork._count.images >= MAX_ARTWORK_IMAGES) {
    return uploadError(`Maksimal ${MAX_ARTWORK_IMAGES} foto per karya. Hapus foto lain dulu.`, 409);
  }

  const upload = await receiveImageUpload(request);
  if (upload instanceof Response) return upload;
  const isProcess = upload.form.get("isProcess") === "1";

  try {
    const image = await db.$transaction(async (tx) => {
      const last = await tx.artworkImage.aggregate({ where: { artworkId: id }, _max: { order: true } });
      const created = await tx.artworkImage.create({
        data: {
          artworkId: id,
          storageKey: upload.image.storageKey,
          width: upload.image.width,
          height: upload.image.height,
          isProcess,
          order: (last._max.order ?? -1) + 1,
        },
        select: { id: true },
      });
      await syncCover(tx, id);
      return tx.artworkImage.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          storageKey: true,
          width: true,
          height: true,
          alt: true,
          order: true,
          isCover: true,
          isProcess: true,
        },
      });
    });
    revalidateArtwork(id);
    return jsonResult({ ok: true, data: image });
  } catch (error) {
    await discardStoredImage(upload.image); // jangan tinggalkan file yatim
    throw error;
  }
}
