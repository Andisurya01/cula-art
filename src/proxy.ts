import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, STUDIO_PATH_HEADER, sessionCookieOptions } from "@/features/auth/cookie";
import { loginHref } from "@/lib/routes";

/**
 * Cek cepat untuk /studio/*: tanpa cookie sesi → /masuk?next=…. Ini bukan pemeriksaan keamanan;
 * sesi divalidasi di requireAdmin() (layout, halaman, Server Action, Route Handler).
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  // Server Action tanpa cookie diteruskan: requireAdmin() di aksi yang mengarahkan ke /masuk.
  if (!token && !request.headers.has("next-action")) {
    return NextResponse.redirect(new URL(loginHref(path), request.url));
  }

  const headers = new Headers(request.headers);
  headers.set(STUDIO_PATH_HEADER, path);
  const response = NextResponse.next({ request: { headers } });
  // Perpanjang umur cookie setiap Studio dibuka (masa berlaku sebenarnya ada di DB).
  if (token) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

// Route Handler unggah foto (…/foto, pengaturan/foto-profil) sengaja tidak lewat proxy: proxy membuffer
// body setiap request yang cocok, dan unggahan sampai 15 MB. Handler itu tetap diawali requireAdmin().
export const config = {
  matcher: ["/studio", "/studio/((?!(?:karya|proyek)/[^/]+/foto$|pengaturan/foto-profil$).*)"],
};
