import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { requireAdmin } from "@/features/auth/dal";
import { getArtworkStatus } from "@/features/artworks/queries";
import { ArtworkDetailView } from "@/features/gallery/components/artwork-detail";
import { galleryDisplayFont } from "@/features/gallery/components/layout/fonts";
import { getArtworkPreview, getGalleryProfile } from "@/features/gallery/queries";
import { ARTWORK_VISIBILITY_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const status = await getArtworkStatus((await params).id);
  return { title: status ? `Pratinjau: ${status.title}` : "Karya tidak ditemukan" };
}

const NOTE = {
  DRAFT: "belum tampil di Galeri",
  PUBLISHED: "sudah tampil di Galeri",
  ARCHIVED: "diarsipkan, tidak tampil di Galeri",
} as const;

/** Pratinjau karya (status apa pun) memakai tampilan detail Galeri yang sama persis. */
export default async function ArtworkPreviewPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [status, artwork, profile] = await Promise.all([
    getArtworkStatus(id),
    getArtworkPreview(id),
    getGalleryProfile(),
  ]);
  if (!status || !artwork) notFound();

  return (
    <div className={cn(galleryDisplayFont.variable, "-mx-4 md:-mx-8")}>
      <div
        role="status"
        className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-sm md:mx-8"
      >
        <p className="flex items-center gap-2">
          <Eye className="size-4 shrink-0" aria-hidden />
          <span>
            <strong>Pratinjau</strong> · {ARTWORK_VISIBILITY_LABELS[status.visibility]}: {NOTE[status.visibility]}.
          </span>
        </p>
        <Link
          href={routes.studio.artwork(id)}
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Kembali ke form
        </Link>
      </div>
      <ArtworkDetailView
        artwork={artwork}
        profile={profile}
        url={absoluteUrl(routes.gallery.artwork(status.slug))}
        related={[]}
        preview
      />
    </div>
  );
}
