// Integrasi ke galeri_test: alur /masuk (password → 2FA/setup), kode pemulihan, dan lockout.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { fakeRequest } from "@/test/next-headers";
import { CHALLENGE_COOKIE, SESSION_COOKIE } from "./cookie";
import { confirmTotpSetup, submitPassword, submitSecondFactor } from "./login-actions";
import { hashPassword } from "./password";
import { generateRecoveryCodes, hashRecoveryCode } from "./recovery-codes";
import { base32Decode, hotp, totpStep } from "./totp";

vi.mock("next/headers", async () => (await import("@/test/next-headers")).nextHeadersMock());

const EMAIL = "andi@contoh.id";
const PASSWORD = "password-panjang-123";
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
let passwordHash: string;

const currentCode = (offset = 0) => hotp(base32Decode(SECRET), totpStep(new Date()) + offset);

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

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(async () => {
  await resetDatabase();
  fakeRequest.reset();
});

describe("langkah password", () => {
  it("email tidak terdaftar dan password salah memberi pesan yang sama", async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash, totpSecret: SECRET } });
    const unknown = await submitPassword({ email: "lain@contoh.id", password: PASSWORD });
    const wrong = await submitPassword({ email: EMAIL, password: "salah-salah-salah" });
    expect(unknown).toEqual({ ok: false, error: "Email atau password salah." });
    expect(wrong).toEqual(unknown);
    expect(fakeRequest.cookies.has(CHALLENGE_COOKIE)).toBe(false);
  });

  it("password benar + 2FA aktif → tahap verifikasi, belum ada sesi", async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash, totpSecret: SECRET } });
    const result = await submitPassword({ email: "ANDI@contoh.id", password: PASSWORD });
    expect(result).toEqual({ ok: true, data: { step: "verify" } });
    expect(fakeRequest.cookies.has(CHALLENGE_COOKIE)).toBe(true);
    expect(fakeRequest.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(await db.session.count()).toBe(0);
  });

  it("5 gagal → terkunci, password benar pun ditolak", async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash, totpSecret: SECRET } });
    for (let i = 0; i < 5; i++) {
      expect((await submitPassword({ email: EMAIL, password: `salah-${i}-xxxxxxx` })).ok).toBe(false);
    }
    const locked = await submitPassword({ email: EMAIL, password: PASSWORD });
    expect(locked.ok).toBe(false);
    expect(!locked.ok && locked.error).toMatch(/Terlalu banyak percobaan gagal/);
  });

  it("kunci per email berlaku walau IP berganti", async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash, totpSecret: SECRET } });
    for (let i = 0; i < 5; i++) {
      fakeRequest.headers.set("x-forwarded-for", `198.51.100.${i}`);
      await submitPassword({ email: EMAIL, password: `salah-${i}-xxxxxxx` });
    }
    fakeRequest.headers.set("x-forwarded-for", "192.0.2.99");
    const locked = await submitPassword({ email: EMAIL, password: PASSWORD });
    expect(!locked.ok && locked.error).toMatch(/Terlalu banyak/);
  });
});

describe("langkah 2FA", () => {
  beforeEach(async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash, totpSecret: SECRET } });
    await submitPassword({ email: EMAIL, password: PASSWORD });
  });

  it("kode benar → sesi dibuat, tahap login dihapus, redirect ke next yang aman", async () => {
    const target = await redirectTarget(() => submitSecondFactor({ code: currentCode(), next: "/studio/ide" }));
    expect(target).toBe("/studio/ide");
    expect(fakeRequest.cookies.has(SESSION_COOKIE)).toBe(true);
    expect(fakeRequest.cookies.has(CHALLENGE_COOKIE)).toBe(false);
    expect(await db.session.count()).toBe(1);
    expect(await db.loginChallenge.count()).toBe(0);
  });

  it("next ke situs lain diganti /studio", async () => {
    expect(await redirectTarget(() => submitSecondFactor({ code: currentCode(), next: "https://evil.com" }))).toBe(
      "/studio",
    );
  });

  it("kode salah ditolak; kode yang sama tidak bisa dipakai ulang", async () => {
    const wrong = await submitSecondFactor({ code: "000000" === currentCode() ? "111111" : "000000" });
    expect(wrong.ok).toBe(false);

    const code = currentCode();
    await redirectTarget(() => submitSecondFactor({ code }));
    await submitPassword({ email: EMAIL, password: PASSWORD });
    const replay = await submitSecondFactor({ code });
    expect(replay.ok).toBe(false);
  });

  it("kode pemulihan berfungsi sekali", async () => {
    const codes = generateRecoveryCodes();
    await db.adminUser.update({
      where: { email: EMAIL },
      data: { recoveryCodeHashes: codes.map(hashRecoveryCode) },
    });

    expect(await redirectTarget(() => submitSecondFactor({ code: codes[3].toUpperCase() }))).toBe("/studio");
    const user = await db.adminUser.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.recoveryCodeHashes).toHaveLength(9);

    await submitPassword({ email: EMAIL, password: PASSWORD });
    const again = await submitSecondFactor({ code: codes[3] });
    expect(!again.ok && again.error).toMatch(/sudah dipakai/);
  });

  it("tanpa tahap password (cookie tahap login tidak ada) → ditolak", async () => {
    fakeRequest.cookies.delete(CHALLENGE_COOKIE);
    const result = await submitSecondFactor({ code: currentCode() });
    expect(!result.ok && result.error).toMatch(/Waktu login habis/);
  });

  it("tebakan paralel: paling banyak 5 yang diverifikasi, sisanya langsung terkunci", async () => {
    const wrong = currentCode() === "000000" ? "111111" : "000000";
    const results = await Promise.all(Array.from({ length: 20 }, () => submitSecondFactor({ code: wrong })));
    const verified = results.filter((r) => !r.ok && r.error.startsWith("Kode tidak cocok")).length;
    const locked = results.filter((r) => !r.ok && r.error.startsWith("Terlalu banyak")).length;
    expect(verified).toBeLessThanOrEqual(5);
    expect(verified + locked).toBe(20);
    const after = await submitSecondFactor({ code: currentCode() });
    expect(!after.ok && after.error).toMatch(/Terlalu banyak/);
  });

  it("password benar lalu 2FA sukses mengosongkan hitungan; percobaan saat terkunci tidak dicatat", async () => {
    await submitSecondFactor({ code: "999999" === currentCode() ? "888888" : "999999" });
    await redirectTarget(() => submitSecondFactor({ code: currentCode() }));
    const rows = await db.loginAttempt.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.filter((r) => !r.success)).toHaveLength(2); // 1 kode salah × (ip + email)
    expect(rows.filter((r) => r.success)).toHaveLength(2);
  });

  it("5 kode salah → terkunci", async () => {
    for (let i = 0; i < 5; i++) await submitSecondFactor({ code: `99999${i}` });
    const locked = await submitSecondFactor({ code: currentCode() });
    expect(!locked.ok && locked.error).toMatch(/Terlalu banyak/);
  });
});

describe("setup 2FA pada login pertama", () => {
  it("QR + secret, konfirmasi kode → 2FA aktif, 10 kode pemulihan, sesi dibuat", async () => {
    await db.adminUser.create({ data: { email: EMAIL, passwordHash } });
    const step = await submitPassword({ email: EMAIL, password: PASSWORD });
    if (!step.ok || step.data.step !== "setup") throw new Error("seharusnya tahap setup");
    expect(step.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    const secret = step.data.secret.replace(/\s/g, "");
    const wrong = await confirmTotpSetup({ code: "123456" === hotp(base32Decode(secret), totpStep(new Date())) ? "654321" : "123456" });
    expect(wrong.ok).toBe(false);

    const result = await confirmTotpSetup({ code: hotp(base32Decode(secret), totpStep(new Date())) });
    if (!result.ok) throw new Error(result.error);
    expect(result.data.recoveryCodes).toHaveLength(10);

    const user = await db.adminUser.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.totpSecret).toBe(secret);
    expect(user.recoveryCodeHashes).toEqual(result.data.recoveryCodes.map(hashRecoveryCode));
    expect(await db.session.count()).toBe(1);
  });
});
