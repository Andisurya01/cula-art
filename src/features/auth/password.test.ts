import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

describe("password scrypt", () => {
  it("hash bisa diverifikasi, password lain ditolak", async () => {
    const hash = await hashPassword("rahasia-panjang-sekali");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword("rahasia-panjang-sekali", hash)).toBe(true);
    expect(await verifyPassword("rahasia-panjang-sekalI", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("salt acak: password sama menghasilkan hash berbeda", async () => {
    const [a, b] = await Promise.all([hashPassword("password-yang-sama"), hashPassword("password-yang-sama")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("password-yang-sama", b)).toBe(true);
  });

  it("normalisasi Unicode (NFKC) sebelum hash", async () => {
    const hash = await hashPassword("café-12345678");
    expect(await verifyPassword("café-12345678", hash)).toBe(true);
  });

  it("hash rusak atau parameter berlebihan ditolak tanpa error", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc$8$1$c2FsdA$aGFzaA")).toBe(false);
    expect(await verifyPassword("x", "scrypt$2097152$8$1$c2FsdA$aGFzaA")).toBe(false);
    expect(await verifyPassword("x", "scrypt$32768$8$1$c2FsdA$aGFzaA")).toBe(false); // panjang hash salah
  });

  it("syarat password baru: 12-256 karakter", () => {
    expect(passwordProblem("pendek")).toMatch(/minimal 12/);
    expect(passwordProblem("a".repeat(12))).toBeNull();
    expect(passwordProblem("a".repeat(257))).toMatch(/maksimal/);
  });
});
