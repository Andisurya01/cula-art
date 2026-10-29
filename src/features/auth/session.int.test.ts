// Integrasi ke galeri_test: sesi DB + cookie (next/headers di-mock) + requireAdmin().

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { fakeRequest } from "@/test/next-headers";
import { SESSION_COOKIE, SESSION_TTL_MS, STUDIO_PATH_HEADER } from "./cookie";
import { requireAdmin } from "./dal";
import { createSession, deleteCurrentSession, getCurrentSession } from "./session";
import { hashToken } from "./tokens";

vi.mock("next/headers", async () => (await import("@/test/next-headers")).nextHeadersMock());

async function createAdmin({ withTotp = true } = {}) {
  return db.adminUser.create({
    data: {
      email: "andi@contoh.id",
      passwordHash: "scrypt$1$1$1$x$y",
      totpSecret: withTotp ? "JBSWY3DPEHPK3PXP" : null,
    },
  });
}

function sessionToken(): string {
  const token = fakeRequest.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("cookie sesi tidak dipasang");
  return token;
}

/** `redirect()` Next melempar error ber-digest `NEXT_REDIRECT;…;<url>;…`. */
async function redirectTarget(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}

beforeEach(async () => {
  await resetDatabase();
  fakeRequest.reset();
});

describe("sesi", () => {
  it("createSession: cookie httpOnly/SameSite=Lax berisi token acak; DB hanya menyimpan hash", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);

    const entry = fakeRequest.cookies.get(SESSION_COOKIE)!;
    expect(entry.value).toMatch(/^[\w-]{43}$/);
    expect(entry.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(entry.options?.maxAge).toBe(SESSION_TTL_MS / 1000);

    const row = await db.session.findFirstOrThrow({ where: { adminUserId: admin.id } });
    expect(row.tokenHash).toBe(hashToken(entry.value));
    expect(row.tokenHash).not.toContain(entry.value);
    expect(row.ip).toBe("203.0.113.7");
    expect(row.userAgent).toContain("Chrome");
  });

  it("getCurrentSession: valid → data akun; tanpa cookie atau token salah → null", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    expect(await getCurrentSession()).toMatchObject({ user: { id: admin.id, email: admin.email } });

    fakeRequest.cookies.set(SESSION_COOKIE, { value: "token-palsu" });
    expect(await getCurrentSession()).toBeNull();

    fakeRequest.cookies.clear();
    expect(await getCurrentSession()).toBeNull();
  });

  it("sesi kedaluwarsa ditolak dan dihapus", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await getCurrentSession()).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it("sesi diperpanjang 30 hari saat dipakai (paling sering sekali per menit)", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    const old = new Date(Date.now() - 5 * 86_400_000);
    await db.session.updateMany({ data: { lastUsedAt: old, expiresAt: new Date(Date.now() + 86_400_000) } });

    await getCurrentSession();
    const row = await db.session.findFirstOrThrow();
    expect(row.lastUsedAt.getTime()).toBeGreaterThan(old.getTime());
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + SESSION_TTL_MS - 60_000);
  });

  it("akun tanpa 2FA aktif tidak punya sesi berlaku (mis. setelah reset-2fa)", async () => {
    const admin = await createAdmin({ withTotp: false });
    await createSession(admin.id);
    expect(await getCurrentSession()).toBeNull();
  });

  it("logout (deleteCurrentSession) mencabut sesi di DB dan menghapus cookie", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    const token = sessionToken();

    await deleteCurrentSession();
    expect(fakeRequest.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(await db.session.count()).toBe(0);

    // Token lama yang masih tersimpan di tempat lain tidak bisa dipakai lagi.
    fakeRequest.cookies.set(SESSION_COOKIE, { value: token });
    expect(await getCurrentSession()).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("tanpa sesi valid → redirect ke /masuk dengan next dari proxy", async () => {
    fakeRequest.headers.set(STUDIO_PATH_HEADER, "/studio/kalender?view=month");
    expect(await redirectTarget(() => requireAdmin())).toBe("/masuk?next=%2Fstudio%2Fkalender%3Fview%3Dmonth");
  });

  it("header next berbahaya diabaikan", async () => {
    fakeRequest.headers.set(STUDIO_PATH_HEADER, "//evil.com");
    expect(await redirectTarget(() => requireAdmin())).toBe("/masuk");
  });

  it("sesi valid → mengembalikan sesi", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    const session = await requireAdmin();
    expect(session.user.id).toBe(admin.id);
  });

  it("sesi dicabut dari perangkat lain → redirect", async () => {
    const admin = await createAdmin();
    await createSession(admin.id);
    await db.session.deleteMany({ where: { adminUserId: admin.id } });
    expect(await redirectTarget(() => requireAdmin())).toBe("/masuk");
  });
});
