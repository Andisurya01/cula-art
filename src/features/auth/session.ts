import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { LoginChallengeKind } from "@prisma/client";
import { db } from "@/lib/db";
import {
  CHALLENGE_COOKIE,
  CHALLENGE_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  challengeCookieOptions,
  sessionCookieOptions,
} from "./cookie";
import { getRequestMeta } from "./request-meta";
import { generateToken, hashToken } from "./tokens";

/** Sesi hanya diperpanjang (DB write) paling sering sekali per menit. */
const TOUCH_INTERVAL_MS = 60_000;

export type CurrentSession = {
  sessionId: string;
  user: { id: string; email: string };
};

/** Buat sesi penuh (setelah password + 2FA) dan pasang cookie. Hanya di Server Action. */
export async function createSession(adminUserId: string): Promise<void> {
  const token = generateToken();
  const { ip, userAgent } = await getRequestMeta();
  const now = new Date();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      adminUserId,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      lastUsedAt: now,
      userAgent,
      ip,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

/**
 * Sesi dari cookie, atau null jika tidak ada/kedaluwarsa/dicabut. Sesi yang dipakai diperpanjang
 * 30 hari. Dibungkus `cache` supaya satu request hanya membaca DB sekali.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      adminUser: { select: { id: true, email: true, totpSecret: true } },
    },
  });
  if (!session) return null;

  const now = new Date();
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  // 2FA wajib: sesi tanpa 2FA aktif (mis. setelah reset-2fa dari CLI) tidak berlaku.
  if (!session.adminUser.totpSecret) return null;

  if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.updateMany({
      where: { id: session.id },
      data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
    });
  }

  return {
    sessionId: session.id,
    user: { id: session.adminUser.id, email: session.adminUser.email },
  };
});

/** Hapus sesi saat ini (DB + cookie). Hanya di Server Action. */
export async function deleteCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// ---- Tahap login (password benar, menunggu 2FA) ----

export async function startChallenge(
  adminUserId: string,
  kind: LoginChallengeKind,
  pendingTotpSecret: string | null = null,
): Promise<void> {
  const token = generateToken();
  // Satu tahap login aktif per akun.
  await db.loginChallenge.deleteMany({ where: { adminUserId } });
  await db.loginChallenge.create({
    data: {
      tokenHash: hashToken(token),
      adminUserId,
      kind,
      pendingTotpSecret,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
  (await cookies()).set(CHALLENGE_COOKIE, token, challengeCookieOptions());
}

/** Tahap login yang masih berlaku untuk jenis tertentu, beserta akunnya. */
export async function getChallenge(kind: LoginChallengeKind) {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  const challenge = await db.loginChallenge.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { adminUser: true },
  });
  if (!challenge || challenge.kind !== kind || challenge.expiresAt <= new Date()) return null;
  return challenge;
}

export async function endChallenge(): Promise<void> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (token) await db.loginChallenge.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(CHALLENGE_COOKIE);
}
