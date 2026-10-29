// Hash password dengan scrypt (node:crypto, tanpa modul native). Tanpa "server-only"
// supaya bisa dipakai skrip CLI (scripts/admin-*.ts).

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

// N = 2^15, r = 8 → ±32 MB memori per hash. Parameter ikut disimpan, jadi bisa dinaikkan nanti.
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function scryptAsync(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function maxmem(N: number, r: number): number {
  return 256 * N * r; // 2× kebutuhan 128·N·r
}

/** Format: `scrypt$N$r$p$<salt base64url>$<hash base64url>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, { ...PARAMS, maxmem: maxmem(PARAMS.N, PARAMS.r) });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Bandingkan password dengan hash tersimpan (waktu konstan). Hash rusak → false. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > 2 ** 20 || r > 32 || p > 16) {
    return false;
  }
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scryptAsync(password, salt, { N, r, p, maxmem: maxmem(N, r) });
  return timingSafeEqual(actual, expected);
}

/** Pesan error untuk password baru, atau null jika memenuhi syarat. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password minimal ${PASSWORD_MIN_LENGTH} karakter`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Password maksimal ${PASSWORD_MAX_LENGTH} karakter`;
  return null;
}

let dummyHash: Promise<string> | null = null;

/** Hash tiruan untuk email yang tidak terdaftar, supaya waktu respons tidak membocorkan email. */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
