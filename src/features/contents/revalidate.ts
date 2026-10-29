import "server-only";
import { revalidatePath } from "next/cache";
import { revalidateGallery } from "@/features/gallery/revalidate";
import { routePatterns, routes } from "@/lib/routes";

/** Semua route yang menampilkan data konten/post. Dipanggil setelah mutasi konten, checklist, atau post. */
export function revalidateContent(
  contentId?: string,
  options: { skipDetail?: boolean } = {},
) {
  revalidatePath(routes.studio.pipeline);
  if (contentId) revalidatePath(routes.studio.content(contentId));
  else if (!options.skipDetail) revalidatePath(routePatterns.content, "page");
  revalidatePath(routes.studio.calendar);
  revalidatePath(routes.studio.home);
  revalidatePath(routes.studio.projects, "layout"); // daftar + detail proyek (konten proyek)
  revalidatePath(routes.studio.ideas);
  // Tautan post TikTok/IG tampil sebagai video proses di detail karya Galeri.
  revalidateGallery();
}

/** Error bisnis yang dilempar di dalam transaksi supaya transaksi di-rollback. */
export class ContentRuleError extends Error {}
