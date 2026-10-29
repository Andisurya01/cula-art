import { describe, expect, it } from "vitest";
import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  normalizeRecoveryCode,
} from "./recovery-codes";

describe("kode pemulihan", () => {
  it("10 kode unik berformat xxxxx-xxxxx tanpa karakter mirip", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[a-hjkmnp-z2-9]{5}-[a-hjkmnp-z2-9]{5}$/);
  });

  it("normalisasi: huruf kecil, tanpa spasi/tanda hubung", () => {
    expect(normalizeRecoveryCode(" AbCdE-fGhJk ")).toBe("abcdefghjk");
    expect(hashRecoveryCode("ABCDE FGHJK")).toBe(hashRecoveryCode("abcde-fghjk"));
  });

  it("dibedakan dari kode TOTP 6 digit", () => {
    expect(looksLikeRecoveryCode("abcde-fghjk")).toBe(true);
    expect(looksLikeRecoveryCode("123456")).toBe(false);
  });

  it("kode sekali pakai: dipakai → hilang dari daftar", () => {
    const codes = generateRecoveryCodes(3);
    const hashes = codes.map(hashRecoveryCode);
    const remaining = consumeRecoveryCode(hashes, codes[1].toUpperCase());
    expect(remaining).toEqual([hashes[0], hashes[2]]);
    expect(consumeRecoveryCode(remaining!, codes[1])).toBeNull();
    expect(consumeRecoveryCode(hashes, "zzzzz-zzzzz")).toBeNull();
    expect(consumeRecoveryCode(hashes, "123456")).toBeNull();
  });
});
