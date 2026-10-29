import { createHash, randomBytes } from "node:crypto";

/** Token acak 256 bit untuk cookie. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Yang disimpan di database: sha256 token, bukan token aslinya. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
