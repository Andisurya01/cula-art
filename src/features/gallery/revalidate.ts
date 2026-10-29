import "server-only";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";

/**
 * Perbarui cache halaman Galeri. Wajib dipanggil setiap aksi yang mengubah karya (termasuk foto,
 * urutan, status, slug) atau profil publik.
 * Selalu seluruh layout root: header/footer memuat profil, dan file og:image (`opengraph-image.ts`)
 * hanya ikut tervalidasi lewat layout, bukan lewat path halamannya. Situs kecil, jadi murah.
 * - `profile: true`: sitemap tidak berubah, jadi dilewati.
 */
export function revalidateGallery(options: { profile?: boolean } = {}) {
  revalidatePath(routes.gallery.home, "layout");
  if (!options.profile) revalidatePath("/sitemap.xml");
}
