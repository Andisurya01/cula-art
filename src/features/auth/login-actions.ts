"use server";

// Aksi halaman /masuk (publik). Satu-satunya file aksi yang tidak diawali requireAdmin(),
// karena dipakai sebelum ada sesi. Aksi akun yang butuh login ada di ./actions.ts.

import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { safeNextPath } from "@/lib/routes";
import { attemptKeys, lockedMessage } from "./lockout";
import { getDummyHash, verifyPassword } from "./password";
import { beginLoginAttempt, finishLoginAttempt, pruneAuthRecords } from "./rate-limit";
import { consumeRecoveryCode, generateRecoveryCodes, hashRecoveryCode, looksLikeRecoveryCode } from "./recovery-codes";
import { getRequestMeta } from "./request-meta";
import { loginSchema, secondFactorSchema, totpSetupSchema } from "./schema";
import { createSession, endChallenge, getChallenge, startChallenge } from "./session";
import { formatSecretForDisplay, generateTotpSecret, totpUri, verifyTotp } from "./totp";

const INVALID_CREDENTIALS = "Email atau password salah.";
const CHALLENGE_EXPIRED = "Waktu login habis. Masukkan email dan password lagi.";
const INVALID_CODE = "Kode tidak cocok. Periksa jam di HP, lalu coba lagi.";
const TOTP_ISSUER = "Studio Karya";

export type PasswordStepResult =
  | { step: "verify" }
  | { step: "setup"; qrDataUrl: string; secret: string };

/** Langkah 1: email + password. Lanjut ke kode 2FA, atau setup 2FA pada login pertama. */
export async function submitPassword(input: unknown): Promise<ActionResult<PasswordStepResult>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { email, password } = parsed.data;

  const now = new Date();
  const { ip } = await getRequestMeta();
  const ticket = await beginLoginAttempt(attemptKeys({ ip, email }), now);
  if (ticket.lockedUntil) return fail(lockedMessage(ticket.lockedUntil, now));

  const user = await db.adminUser.findUnique({ where: { email } });
  // Email tidak terdaftar tetap menjalankan scrypt supaya waktu respons sama.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await finishLoginAttempt(ticket, "failure");
    return fail(INVALID_CREDENTIALS);
  }

  // Password benar belum dihitung sukses (2FA belum), tapi juga bukan kegagalan.
  await finishLoginAttempt(ticket, "neutral");
  await pruneAuthRecords(now);

  if (user.totpSecret) {
    await startChallenge(user.id, "VERIFY");
    return ok({ step: "verify" });
  }

  const secret = generateTotpSecret();
  await startChallenge(user.id, "SETUP", secret);
  const qrDataUrl = await QRCode.toDataURL(totpUri({ secret, account: user.email, issuer: TOTP_ISSUER }), {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
  });
  return ok({ step: "setup", qrDataUrl, secret: formatSecretForDisplay(secret) });
}

/** Langkah 2: kode 2FA 6 digit atau kode pemulihan. Berhasil → sesi dibuat, lalu redirect. */
export async function submitSecondFactor(input: unknown): Promise<ActionResult> {
  const parsed = secondFactorSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const challenge = await getChallenge("VERIFY");
  const user = challenge?.adminUser;
  const totpSecret = user?.totpSecret;
  if (!user || !totpSecret) return fail(CHALLENGE_EXPIRED);

  const now = new Date();
  const { ip } = await getRequestMeta();
  const ticket = await beginLoginAttempt(attemptKeys({ ip, email: user.email }), now);
  if (ticket.lockedUntil) return fail(lockedMessage(ticket.lockedUntil, now));

  const code = parsed.data.code;
  let accepted = false;
  if (looksLikeRecoveryCode(code)) {
    const remaining = consumeRecoveryCode(user.recoveryCodeHashes, code);
    if (remaining) {
      // `has` mencegah satu kode dipakai dua kali oleh request yang bersamaan.
      const { count } = await db.adminUser.updateMany({
        where: { id: user.id, recoveryCodeHashes: { has: hashRecoveryCode(code) } },
        data: { recoveryCodeHashes: remaining },
      });
      accepted = count === 1;
    }
  } else {
    const step = verifyTotp(totpSecret, code, now, user.totpLastStep);
    if (step !== null) {
      const { count } = await db.adminUser.updateMany({
        where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
        data: { totpLastStep: step },
      });
      accepted = count === 1;
    }
  }

  if (!accepted) {
    await finishLoginAttempt(ticket, "failure");
    return fail(looksLikeRecoveryCode(code) ? "Kode pemulihan tidak valid atau sudah dipakai." : INVALID_CODE);
  }

  await finishLoginAttempt(ticket, "success");
  await endChallenge();
  await createSession(user.id);
  redirect(safeNextPath(parsed.data.next));
}

/**
 * Login pertama: konfirmasi setup 2FA dengan kode dari aplikasi authenticator.
 * Mengembalikan 10 kode pemulihan, yang hanya ditampilkan sekali ini.
 */
export async function confirmTotpSetup(input: unknown): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  const parsed = totpSetupSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const challenge = await getChallenge("SETUP");
  if (!challenge?.pendingTotpSecret) return fail(CHALLENGE_EXPIRED);
  const user = challenge.adminUser;

  const now = new Date();
  const { ip } = await getRequestMeta();
  const ticket = await beginLoginAttempt(attemptKeys({ ip, email: user.email }), now);
  if (ticket.lockedUntil) return fail(lockedMessage(ticket.lockedUntil, now));

  const step = verifyTotp(challenge.pendingTotpSecret, parsed.data.code, now);
  if (step === null) {
    await finishLoginAttempt(ticket, "failure");
    return fail(INVALID_CODE);
  }

  const recoveryCodes = generateRecoveryCodes();
  const { count } = await db.adminUser.updateMany({
    where: { id: user.id, totpSecret: null },
    data: {
      totpSecret: challenge.pendingTotpSecret,
      totpLastStep: step,
      recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
    },
  });
  if (count !== 1) {
    await finishLoginAttempt(ticket, "neutral");
    await endChallenge();
    return fail("2FA akun ini sudah aktif. Masuk lagi dengan kode dari aplikasi authenticator.");
  }

  await finishLoginAttempt(ticket, "success");
  await endChallenge();
  await createSession(user.id);
  return ok({ recoveryCodes });
}

/** Batalkan tahap login (tombol Kembali). */
export async function cancelLogin(): Promise<ActionResult> {
  await endChallenge();
  return ok();
}
