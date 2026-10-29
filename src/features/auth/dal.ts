import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginHref } from "@/lib/routes";
import { STUDIO_PATH_HEADER } from "./cookie";
import { getCurrentSession, type CurrentSession } from "./session";

/**
 * Pemeriksaan akses Studio yang sesungguhnya (Data Access Layer). Wajib dipanggil di layout,
 * setiap halaman, Server Action, dan Route Handler Studio; `src/proxy.ts` hanya cek cepat cookie.
 * Tanpa sesi valid → redirect ke `/masuk?next=…`.
 */
export const requireAdmin = cache(async (): Promise<CurrentSession> => {
  const session = await getCurrentSession();
  if (!session) {
    const path = (await headers()).get(STUDIO_PATH_HEADER);
    redirect(loginHref(path ?? undefined));
  }
  return session;
});
