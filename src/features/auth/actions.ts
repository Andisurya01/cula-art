"use server";

// Aksi Akun & keamanan (tab Pengaturan). Semua diawali requireAdmin().

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { routes } from "@/lib/routes";
import { requireAdmin } from "./dal";
import { hashPassword, verifyPassword } from "./password";
import { generateRecoveryCodes, hashRecoveryCode } from "./recovery-codes";
import { changePasswordSchema, currentPasswordSchema, sessionIdSchema } from "./schema";
import { clearSessionCookie, deleteCurrentSession } from "./session";

const WRONG_PASSWORD = "Password saat ini salah.";

async function checkCurrentPassword(userId: string, password: string): Promise<boolean> {
  const user = await db.adminUser.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return user ? verifyPassword(password, user.passwordHash) : false;
}

/** Ganti password. Sesi di perangkat lain ikut dicabut. */
export async function changePassword(input: unknown): Promise<ActionResult<{ revoked: number }>> {
  const { sessionId, user } = await requireAdmin();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  if (!(await checkCurrentPassword(user.id, parsed.data.currentPassword))) return fail(WRONG_PASSWORD);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const [, revoked] = await db.$transaction([
    db.adminUser.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } }),
    db.session.deleteMany({ where: { adminUserId: user.id, id: { not: sessionId } } }),
    // Tahap login yang sedang menunggu 2FA (password lama sudah benar) ikut dibatalkan.
    db.loginChallenge.deleteMany({ where: { adminUserId: user.id } }),
  ]);
  return ok({ revoked: revoked.count });
}

/** Cabut satu sesi di perangkat lain. Sesi ini sendiri ditutup lewat Keluar. */
export async function revokeSession(input: unknown): Promise<ActionResult> {
  const { sessionId, user } = await requireAdmin();
  const parsed = sessionIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.sessionId === sessionId) return fail("Gunakan tombol Keluar untuk sesi ini.");

  const { count } = await db.session.deleteMany({
    where: { id: parsed.data.sessionId, adminUserId: user.id },
  });
  return count === 1 ? ok() : fail("Sesi sudah tidak aktif.");
}

/** Cabut semua sesi kecuali perangkat ini. */
export async function revokeOtherSessions(): Promise<ActionResult<{ revoked: number }>> {
  const { sessionId, user } = await requireAdmin();
  const { count } = await db.session.deleteMany({
    where: { adminUserId: user.id, id: { not: sessionId } },
  });
  return ok({ revoked: count });
}

/** Keluar dari semua perangkat, termasuk yang ini. */
export async function logoutEverywhere(): Promise<void> {
  const { user } = await requireAdmin();
  await db.session.deleteMany({ where: { adminUserId: user.id } });
  await clearSessionCookie();
  redirect(routes.login);
}

export async function logout(): Promise<void> {
  await requireAdmin();
  await deleteCurrentSession();
  redirect(routes.login);
}

/** Buat 10 kode pemulihan baru; kode lama tidak berlaku lagi. Ditampilkan sekali. */
export async function regenerateRecoveryCodes(
  input: unknown,
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  const { user } = await requireAdmin();
  const parsed = currentPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkCurrentPassword(user.id, parsed.data.currentPassword))) return fail(WRONG_PASSWORD);

  const recoveryCodes = generateRecoveryCodes();
  await db.adminUser.update({
    where: { id: user.id },
    data: { recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) },
  });
  return ok({ recoveryCodes });
}
