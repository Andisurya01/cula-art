import { routes } from "@/lib/routes";
import { galleryCopy } from "../../copy";

export const GALLERY_NAV = [
  { href: routes.gallery.home, label: galleryCopy.nav.home },
  { href: routes.gallery.catalog, label: galleryCopy.nav.catalog },
  { href: routes.gallery.about, label: galleryCopy.nav.about },
] as const;

/** Beranda hanya aktif di "/", menu lain juga untuk sub-halaman (mis. /karya/naga). */
export function isGalleryNavActive(pathname: string, href: string): boolean {
  if (href === routes.gallery.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
