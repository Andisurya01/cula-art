import "server-only";
import { db } from "@/lib/db";
import type { CurrentSession } from "./session";
import { describeUserAgent } from "./user-agent";

/** Data tab Akun & keamanan: email, sisa kode pemulihan, sesi aktif (terbaru dulu). */
export async function getAccountSecurity(current: CurrentSession) {
  const [user, sessions] = await Promise.all([
    db.adminUser.findUniqueOrThrow({
      where: { id: current.user.id },
      select: { email: true, passwordChangedAt: true, recoveryCodeHashes: true },
    }),
    db.session.findMany({
      where: { adminUserId: current.user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: { id: true, userAgent: true, ip: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  return {
    email: user.email,
    passwordChangedAt: user.passwordChangedAt,
    recoveryCodesLeft: user.recoveryCodeHashes.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      device: describeUserAgent(s.userAgent),
      ip: s.ip,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      current: s.id === current.sessionId,
    })),
  };
}
export type AccountSecurity = Awaited<ReturnType<typeof getAccountSecurity>>;
