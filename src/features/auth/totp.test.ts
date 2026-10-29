import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  formatSecretForDisplay,
  generateTotpSecret,
  hotp,
  totp,
  totpStep,
  totpUri,
  verifyTotp,
} from "./totp";

// RFC 6238 Appendix B (SHA1, seed ASCII "12345678901234567890", 8 digit).
const RFC_SECRET = Buffer.from("12345678901234567890", "ascii");
const RFC_VECTORS: [number, string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("base32 (RFC 4648)", () => {
  it.each([
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
  ])("%s ↔ %s", (plain, encoded) => {
    expect(base32Encode(Buffer.from(plain))).toBe(encoded);
    expect(base32Decode(encoded).toString()).toBe(plain);
  });

  it("decode mengabaikan spasi, huruf kecil, dan padding", () => {
    expect(base32Decode("mzxw 6ytb oi==").toString()).toBe("foobar");
  });

  it("karakter tidak valid ditolak", () => {
    expect(() => base32Decode("MZ1W")).toThrow();
  });
});

describe("HOTP/TOTP", () => {
  it("HOTP RFC 4226 Appendix D", () => {
    const expected = ["755224", "287082", "359152", "969429", "338314"];
    expected.forEach((code, counter) => expect(hotp(RFC_SECRET, counter)).toBe(code));
  });

  it.each(RFC_VECTORS)("RFC 6238 T=%i → %s", (seconds, code) => {
    expect(totp(RFC_SECRET, new Date(seconds * 1000), 8)).toBe(code);
  });

  it("secret baru 160 bit (32 karakter base32)", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret)).toHaveLength(20);
    expect(generateTotpSecret()).not.toBe(secret);
  });
});

describe("verifyTotp", () => {
  const secret = base32Encode(RFC_SECRET);
  const now = new Date(1111111111 * 1000);
  const step = totpStep(now);
  const codeAt = (offset: number) => hotp(RFC_SECRET, step + offset);

  it("kode langkah sekarang diterima dan mengembalikan langkahnya", () => {
    expect(verifyTotp(secret, codeAt(0), now)).toBe(step);
  });

  it("toleransi ±1 langkah (30 detik)", () => {
    expect(verifyTotp(secret, codeAt(-1), now)).toBe(step - 1);
    expect(verifyTotp(secret, codeAt(1), now)).toBe(step + 1);
    expect(verifyTotp(secret, codeAt(-2), now)).toBeNull();
    expect(verifyTotp(secret, codeAt(2), now)).toBeNull();
  });

  it("kode yang langkahnya sudah dipakai ditolak (anti-replay)", () => {
    expect(verifyTotp(secret, codeAt(0), now, step)).toBeNull();
    expect(verifyTotp(secret, codeAt(-1), now, step - 1)).toBeNull();
    expect(verifyTotp(secret, codeAt(1), now, step)).toBe(step + 1);
  });

  it("format salah ditolak", () => {
    expect(verifyTotp(secret, "12345", now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", now)).toBeNull();
    expect(verifyTotp(secret, "", now)).toBeNull();
  });

  it("spasi di tengah kode diabaikan", () => {
    const code = codeAt(0);
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, now)).toBe(step);
  });
});

describe("totpUri", () => {
  it("berisi issuer, akun, dan parameter standar", () => {
    const uri = totpUri({ secret: "ABC", account: "andi@contoh.id", issuer: "Studio Karya" });
    expect(uri.startsWith("otpauth://totp/Studio%20Karya%3Aandi%40contoh.id?")).toBe(true);
    const params = new URL(uri).searchParams;
    expect(params.get("secret")).toBe("ABC");
    expect(params.get("issuer")).toBe("Studio Karya");
    expect(params.get("digits")).toBe("6");
    expect(params.get("period")).toBe("30");
  });

  it("secret ditampilkan per 4 huruf", () => {
    expect(formatSecretForDisplay("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
  });
});
