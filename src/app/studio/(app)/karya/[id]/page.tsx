import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { ArtworkDetailForm } from "@/features/artworks/components/artwork-detail-form";
import { ArtworkPhotos } from "@/features/artworks/components/artwork-photos";
import { DeleteArtworkButton } from "@/features/artworks/components/delete-artwork-button";
import { ProcessContents } from "@/features/artworks/components/process-contents";
import { PublishPanel } from "@/features/artworks/components/publish-panel";
import { getArtwork, getArtworkFormOptions } from "@/features/artworks/queries";
import { deleteBlockedReason, publishProblems } from "@/features/artworks/rules";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const artwork = await getArtwork((await params).id);
  return { title: artwork ? artwork.title : "Karya tidak ditemukan" };
}

export default async function ArtworkDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [artwork, options] = await Promise.all([getArtwork(id), getArtworkFormOptions()]);
  if (!artwork) notFound();

  const problems = publishProblems(artwork);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
        <Link href={routes.studio.artworks}>
          <ChevronLeft />
          Semua karya
        </Link>
      </Button>

      <PageHeader
        title={artwork.title}
        description={artwork.summary ?? undefined}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.studio.artworkPreview(artwork.id)}>
                <Eye />
                Pratinjau
              </Link>
            </Button>
            <DeleteArtworkButton
              artworkId={artwork.id}
              title={artwork.title}
              photoCount={artwork.images.length}
              blockedReason={deleteBlockedReason(artwork.availability)}
            />
          </>
        }
      />

      {artwork.project && (
        <p className="-mt-3 mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Layers className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Dari proyek{" "}
            <Link
              href={routes.studio.project(artwork.project.id)}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {artwork.project.title}
            </Link>
          </span>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <PublishPanel
            artworkId={artwork.id}
            slug={artwork.slug}
            visibility={artwork.visibility}
            publishedAt={artwork.publishedAt}
            problems={problems}
          />
        </div>
        <div className="grid min-w-0 gap-5 lg:col-start-1 lg:row-start-1">
          <ArtworkPhotos artworkId={artwork.id} images={artwork.images} />
          <ArtworkDetailForm
            artwork={{
              id: artwork.id,
              title: artwork.title,
              slug: artwork.slug,
              summary: artwork.summary,
              description: artwork.description,
              medium: artwork.medium,
              year: artwork.year,
              widthCm: artwork.widthCm,
              heightCm: artwork.heightCm,
              depthCm: artwork.depthCm,
              materials: artwork.materials,
              weightGram: artwork.weightGram,
              projectId: artwork.projectId,
              availability: artwork.availability,
              priceIdr: artwork.priceIdr,
              showPrice: artwork.showPrice,
              isFeatured: artwork.isFeatured,
              featuredOrder: artwork.featuredOrder,
              publishedAt: artwork.publishedAt,
            }}
            projects={options.projects}
          />
          <ProcessContents
            artworkId={artwork.id}
            selected={artwork.contents.map((c) => c.content)}
            options={options.postedContents}
          />
        </div>
      </div>
    </>
  );
}
