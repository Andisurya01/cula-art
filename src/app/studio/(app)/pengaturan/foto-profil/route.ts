// Unggah foto profil Galeri (POST multipart, field `file`). Lewat Route Handler, bukan Server Action,
// karena Server Action dibatasi 1 MB dan tidak punya progres unggah (client: uploadWithProgress).
// Hapus foto profil memakai Server Action `removeProfilePhoto`.

import { revalidatePath } from "next/cache";
import { discardStoredImage } from "@/lib/images";
import { routes } from "@/lib/routes";
import { deleteFilesQuietly } from "@/lib/storage";
import { jsonResult, receiveImageUpload } from "@/lib/upload-route";
import { requireAdmin } from "@/features/auth/dal";
import { revalidateGallery } from "@/features/gallery/revalidate";
import { replaceAvatarKey } from "@/features/settings/profile-photo";

export async function POST(request: Request) {
  await requireAdmin();
  const upload = await receiveImageUpload(request);
  if (upload instanceof Response) return upload;

  let previousKey: string | null;
  try {
    previousKey = await replaceAvatarKey(upload.image.storageKey);
  } catch (error) {
    await discardStoredImage(upload.image); // jangan tinggalkan file yatim
    throw error;
  }

  // File lama dihapus setelah DB berhasil diperbarui.
  await deleteFilesQuietly([previousKey]);
  revalidatePath(routes.studio.settings);
  revalidateGallery({ profile: true });
  return jsonResult({ ok: true, data: { avatarKey: upload.image.storageKey } });
}
