import "server-only";
import { revalidatePath } from "next/cache";
import { routePatterns, routes } from "@/lib/routes";

/**
 * Semua route yang menampilkan metrik. Skor relatif post lain ikut berubah, jadi seluruh detail post di-revalidate.
 * Saran (Beranda), ringkasan Review Mingguan, dan perbandingan Eksperimen juga dihitung dari metrik.
 */
export function revalidateMetrics(contentId?: string) {
  revalidatePath(routes.studio.home);
  revalidatePath(routes.studio.posts);
  revalidatePath(routePatterns.post, "page");
  revalidatePath(routes.studio.analytics);
  revalidatePath(routes.studio.review);
  revalidatePath(routes.studio.experiments);
  revalidatePath(routePatterns.experiment, "page");
  if (contentId) revalidatePath(routes.studio.content(contentId));
}
