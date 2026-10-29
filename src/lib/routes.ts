// Satu-satunya sumber path internal (nav, href, router.push, redirect, revalidatePath).
// Fungsi murni tanpa import Next supaya bisa dipakai di client, server, proxy, dan test.

const STUDIO = "/studio";

export const routes = {
  studio: {
    home: STUDIO,
    ideas: `${STUDIO}/ide`,
    pipeline: `${STUDIO}/pipeline`,
    content: (id: string) => `${STUDIO}/pipeline/${encodeURIComponent(id)}`,
    calendar: `${STUDIO}/kalender`,
    projects: `${STUDIO}/proyek`,
    project: (id: string) => `${STUDIO}/proyek/${encodeURIComponent(id)}`,
    /** Route Handler unggah foto progres (POST). */
    projectPhotoUpload: (id: string) => `${STUDIO}/proyek/${encodeURIComponent(id)}/foto`,
    artworks: `${STUDIO}/karya`,
    artwork: (id: string) => `${STUDIO}/karya/${encodeURIComponent(id)}`,
    artworkPreview: (id: string) => `${STUDIO}/karya/${encodeURIComponent(id)}/pratinjau`,
    /** Route Handler unggah foto karya (POST). */
    artworkPhotoUpload: (id: string) => `${STUDIO}/karya/${encodeURIComponent(id)}/foto`,
    posts: `${STUDIO}/postingan`,
    analytics: `${STUDIO}/analitik`,
    experiments: `${STUDIO}/eksperimen`,
    review: `${STUDIO}/review`,
    settings: `${STUDIO}/pengaturan`,
    /** Route Handler unggah foto profil (POST). */
    settingsProfilePhoto: `${STUDIO}/pengaturan/foto-profil`,
  },
  gallery: {
    home: "/",
    catalog: "/karya",
    artwork: (slug: string) => `/karya/${encodeURIComponent(slug)}`,
    about: "/tentang",
  },
  login: "/masuk",
  media: (key: string) => `/media/${key}`,
} as const;

/** Pola route (struktur file) untuk `revalidatePath(pattern, "page")`. */
export const routePatterns = {
  content: `${STUDIO}/pipeline/[id]`,
  project: `${STUDIO}/proyek/[id]`,
  artwork: `${STUDIO}/karya/[id]`,
  galleryArtwork: "/karya/[slug]",
} as const;

export function isStudioPath(pathname: string): boolean {
  return pathname === STUDIO || pathname.startsWith(`${STUDIO}/`);
}

/**
 * Tujuan setelah login dari `?next=`. Hanya path Studio relatif yang diterima,
 * supaya parameter ini tidak bisa dipakai untuk open redirect (`//evil.com`, `https://…`).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return routes.studio.home;
  }
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost" || !isStudioPath(url.pathname)) return routes.studio.home;
    return `${url.pathname}${url.search}`;
  } catch {
    return routes.studio.home;
  }
}

/** URL login dengan `?next=` (hanya jika tujuan bukan Beranda Studio). */
export function loginHref(next?: string): string {
  const target = safeNextPath(next);
  return target === routes.studio.home
    ? routes.login
    : `${routes.login}?next=${encodeURIComponent(target)}`;
}
