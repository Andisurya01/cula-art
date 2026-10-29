import "server-only";
import { revalidatePath } from "next/cache";
import { routePatterns, routes } from "@/lib/routes";

/**
 * Revalidate halaman Studio setelah proyek/foto berubah (dipakai Server Action dan Route Handler
 * unggah). Judul dan foto proyek tidak tampil di Galeri, jadi Galeri tidak perlu di-revalidate.
 */
export function revalidateProject(projectId?: string, options: { contents?: boolean } = {}) {
  revalidatePath(routes.studio.projects);
  if (projectId) revalidatePath(routes.studio.project(projectId));
  if (options.contents) {
    revalidatePath(routes.studio.pipeline);
    revalidatePath(routePatterns.content, "page");
  }
  revalidatePath(routes.studio.home);
}
