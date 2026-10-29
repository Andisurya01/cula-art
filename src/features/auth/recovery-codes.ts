// 10 kode pemulihan sekali pakai. Disimpan sebagai sha256 (kode acak ±50 bit + pembatasan login,
// jadi tidak perlu hash lambat seperti password).

import { createHash, randomInt } from "node:crypto";

export const RECOVERY_CODE_COUNT = 10;

// Tanpa huruf/angka yang mirip (i, l, o, 0, 1).
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 10;

/** Kode baru dengan format `xxxxx-xxxxx`. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    let raw = "";
    for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** Huruf kecil, tanpa spasi atau tanda hubung. */
export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

/** Masukan terlihat seperti kode pemulihan (bukan kode TOTP 6 digit). */
export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === CODE_LENGTH;
}

/**
 * Pakai satu kode: kembalikan daftar hash tanpa kode tersebut, atau null jika tidak cocok.
 * Daftar ini menggantikan `recoveryCodeHashes` di database.
 */
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  if (!looksLikeRecoveryCode(code)) return null;
  const hash = hashRecoveryCode(code);
  const index = hashes.indexOf(hash);
  if (index < 0) return null;
  return [...hashes.slice(0, index), ...hashes.slice(index + 1)];
}
