import "server-only";
import { headers } from "next/headers";

/**
 * IP klien. Di produksi aplikasi hanya mendengar di 127.0.0.1 di belakang Caddy, yang menulis
 * ulang X-Forwarded-For; entri terakhir adalah alamat yang dilihat proxy kita sendiri.
 */
export function clientIpFrom(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
    if (last) return last.slice(0, 64);
  }
  return h.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

export async function getRequestMeta(): Promise<{ ip: string; userAgent: string | null }> {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
