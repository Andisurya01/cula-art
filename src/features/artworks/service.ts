import "server-only";
// Helper server Karya yang dipakai Server Action (actions.ts) dan Route Handler unggah foto.

import { revalidatePath } from "next/cache";
import { Prisma, type ArtworkVisibility } from "@prisma/client";
import { revalidateGallery } from "@/features/gallery/revalidate";
import { routes } from "@/lib/routes";
import { slugify, uniqueSlug } from "@/lib/slug";
import { isSlugTakenByOther, resolveCoverId, type PublishState, type SlugOwners } from "./rules";

type Tx = Prisma.TransactionClient;

/** Pemakai slug di Artwork.slug dan ArtworkSlugRedirect.oldSlug. */
export async function getSlugOwners(client: Tx, slug: string): Promise<SlugOwners> {
  const [artwork, redirect] = await Promise.all([
    client.artwork.findUnique({ where: { slug }, select: { id: true } }),
    client.artworkSlugRedirect.findUnique({ where: { oldSlug: slug }, select: { artworkId: true } }),
  ]);
  return { slugOwner: artwork?.id ?? null, redirectOwner: redirect?.artworkId ?? null };
}

/** Slug unik dari judul; slug/redirect milik `selfId` sendiri tidak dianggap terpakai. */
export async function uniqueSlugFromTitle(client: Tx, title: string, selfId?: string): Promise<string> {
  return uniqueSlug(slugify(title), async (slug) => isSlugTakenByOther(await getSlugOwners(client, slug), selfId));
}

/** Pastikan tepat satu cover di antara foto karya jadi (foto proses tidak pernah cover). */
export async function syncCover(client: Tx, artworkId: string): Promise<void> {
  const images = await client.artworkImage.findMany({
    where: { artworkId },
    select: { id: true, isCover: true, isProcess: true, order: true },
  });
  const coverId = resolveCoverId(images);
  const wrong = images.filter((img) => img.isCover !== (img.id === coverId));
  if (wrong.length === 0) return;
  await client.artworkImage.updateMany({
    where: { artworkId, isCover: true, ...(coverId ? { id: { not: coverId } } : {}) },
    data: { isCover: false },
  });
  if (coverId) await client.artworkImage.update({ where: { id: coverId }, data: { isCover: true } });
}

/** Keadaan karya untuk pemeriksaan syarat terbit; null jika karya tidak ada. */
export async function loadPublishState(
  client: Tx,
  artworkId: string,
): Promise<(PublishState & { visibility: ArtworkVisibility }) | null> {
  return client.artwork.findUnique({
    where: { id: artworkId },
    select: {
      title: true,
      medium: true,
      year: true,
      visibility: true,
      images: { select: { id: true, alt: true, isProcess: true } },
    },
  });
}

/** True jika error Prisma adalah pelanggaran unik (mis. slug bentrok karena request bersamaan). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Revalidate halaman Studio karya + semua halaman Galeri. `projectIds`: proyek asal (lama/baru)
 * yang menampilkan daftar karya. Tanpa `artworkId` (setelah hapus) halaman detail tidak dirender ulang.
 */
export function revalidateArtwork(artworkId?: string, projectIds: (string | null | undefined)[] = []): void {
  revalidatePath(routes.studio.artworks);
  if (artworkId) {
    revalidatePath(routes.studio.artwork(artworkId));
    revalidatePath(routes.studio.artworkPreview(artworkId));
  }
  for (const projectId of new Set(projectIds.filter((id): id is string => !!id))) {
    revalidatePath(routes.studio.project(projectId));
  }
  revalidateGallery();
}
