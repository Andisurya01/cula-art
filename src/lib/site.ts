// URL publik situs (sitemap, Open Graph, tautan WhatsApp). Dibaca dari SITE_URL.

const DEFAULT_SITE_URL = "http://localhost:3000";

/** `SITE_URL` tanpa garis miring di akhir; default localhost saat development. */
export function getSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/** URL absolut untuk path internal, mis. `absoluteUrl("/karya/naga")`. */
export function absoluteUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
