// Nama dan atribut cookie auth. Tanpa Prisma/"server-only" supaya bisa dipakai src/proxy.ts.

export const SESSION_COOKIE = "studio_session";
/** Cookie tahap login (setelah password benar, sebelum 2FA). */
export const CHALLENGE_COOKIE = "studio_login";
/** Header dari proxy berisi path Studio yang diminta, untuk `?next=` saat sesi tidak valid. */
export const STUDIO_PATH_HEADER = "x-studio-path";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

function baseOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    // Browser menerima cookie Secure dari http://localhost, jadi `next start` lokal tetap bisa login.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export function sessionCookieOptions(): CookieOptions {
  return baseOptions(SESSION_TTL_MS);
}

export function challengeCookieOptions(): CookieOptions {
  return baseOptions(CHALLENGE_TTL_MS);
}
