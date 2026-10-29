import "server-only";
import { db } from "@/lib/db";
import { LOGIN_LOOKBACK_MS, lockedUntil } from "./lockout";

export type LoginAttemptTicket = { lockedUntil: Date | null; ids: string[] };

/**
 * Pesan satu percobaan login SEBELUM password/kode diverifikasi: baris "gagal" langsung dicatat untuk
 * setiap key, lalu kunci dihitung dari percobaan lain (termasuk yang sedang berjalan bersamaan).
 * Karena setiap request menulis dulu baru membaca, request paralel tidak bisa lolos semua sebelum
 * kegagalan pertama tercatat: paling banyak 5 yang sampai ke tahap verifikasi.
 * Jika terkunci, pesanan dibatalkan (percobaan selama terkunci tidak memperpanjang kunci).
 */
export async function beginLoginAttempt(keys: string[], now = new Date()): Promise<LoginAttemptTicket> {
  const rows = await db.$transaction(
    keys.map((key) => db.loginAttempt.create({ data: { key, success: false }, select: { id: true } })),
  );
  const ids = rows.map((r) => r.id);

  const attempts = await db.loginAttempt.findMany({
    where: {
      key: { in: keys },
      id: { notIn: ids },
      createdAt: { gte: new Date(now.getTime() - LOGIN_LOOKBACK_MS) },
    },
    select: { key: true, success: true, createdAt: true },
  });
  let latest: Date | null = null;
  for (const key of keys) {
    const until = lockedUntil(attempts.filter((a) => a.key === key), now);
    if (until && (!latest || until > latest)) latest = until;
  }

  if (latest) {
    await db.loginAttempt.deleteMany({ where: { id: { in: ids } } });
    return { lockedUntil: latest, ids: [] };
  }
  return { lockedUntil: null, ids };
}

/**
 * Tutup percobaan: `failure` membiarkan baris gagal; `success` (login selesai dengan 2FA) mengubahnya
 * jadi sukses sehingga hitungan kosong lagi; `neutral` (password benar, 2FA belum) menghapusnya.
 */
export async function finishLoginAttempt(
  ticket: LoginAttemptTicket,
  outcome: "failure" | "success" | "neutral",
): Promise<void> {
  if (outcome === "failure" || ticket.ids.length === 0) return;
  if (outcome === "success") {
    await db.loginAttempt.updateMany({ where: { id: { in: ticket.ids } }, data: { success: true } });
  } else {
    await db.loginAttempt.deleteMany({ where: { id: { in: ticket.ids } } });
  }
}

/** Bersihkan catatan lama: percobaan > 1 hari, sesi dan tahap login yang kedaluwarsa. */
export async function pruneAuthRecords(now = new Date()): Promise<void> {
  await db.$transaction([
    db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 86_400_000) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.loginChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
}
