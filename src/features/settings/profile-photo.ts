import "server-only";
// Foto profil Galeri (`Setting.avatarKey`). Dipakai Route Handler unggah
// (`/studio/pengaturan/foto-profil`) dan aksi `removeProfilePhoto`; keduanya sudah memanggil
// `requireAdmin()` sebelum masuk ke sini.

import { db } from "@/lib/db";
import { SETTING_ID, settingCreateData } from "./queries";

/**
 * Ganti `avatarKey` (atau kosongkan dengan `null`) dan kembalikan key sebelumnya, supaya pemanggil
 * bisa menghapus file lama SETELAH transaksi berhasil. Baris dikunci (`FOR UPDATE`) supaya dua
 * unggahan bersamaan tidak sama-sama membaca key lama yang sama dan meninggalkan file yatim.
 */
export async function replaceAvatarKey(nextKey: string | null): Promise<string | null> {
  return db.$transaction(async (tx) => {
    await tx.setting.upsert({ where: { id: SETTING_ID }, update: {}, create: settingCreateData() });
    await tx.$queryRaw`SELECT "id" FROM "Setting" WHERE "id" = ${SETTING_ID} FOR UPDATE`;
    const current = await tx.setting.findUniqueOrThrow({
      where: { id: SETTING_ID },
      select: { avatarKey: true },
    });
    await tx.setting.update({ where: { id: SETTING_ID }, data: { avatarKey: nextKey } });
    return current.avatarKey;
  });
}
