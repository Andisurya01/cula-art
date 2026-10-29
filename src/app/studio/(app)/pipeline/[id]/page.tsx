import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FolderOpen, Lightbulb } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { requireAdmin } from "@/features/auth/dal";
import { ChecklistCard } from "@/features/contents/components/checklist-card";
import { ContentDetailForm } from "@/features/contents/components/content-detail-form";
import { DeleteContentButton } from "@/features/contents/components/delete-content-button";
import { StageControl } from "@/features/contents/components/stage-control";
import { getContentDetail } from "@/features/contents/queries";
import { PostVersions } from "@/features/posts/components/post-versions";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const data = await getContentDetail(id);
  return { title: data ? data.content.title : "Konten tidak ditemukan" };
}

export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const data = await getContentDetail(id);
  if (!data) notFound();
  const { content, options, now } = data;

  return (
    <div className="grid gap-4">
      <Link
        href={routes.studio.pipeline}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Pipeline
      </Link>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight break-words md:text-2xl">
              {content.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <PillarBadge name={content.pillar.name} color={content.pillar.color} />
              {content.project && (
                <Link
                  href={routes.studio.project(content.project.id)}
                  className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                >
                  <FolderOpen className="size-3.5" />
                  {content.project.title}
                  {content.seriesPart && ` · Part ${content.seriesPart}`}
                </Link>
              )}
              {content.idea && (
                <Link
                  href={routes.studio.ideas}
                  className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                  title="Buka Bank Ide"
                >
                  <Lightbulb className="size-3.5" />
                  Dari ide: {content.idea.title}
                </Link>
              )}
            </div>
          </div>
          <DeleteContentButton
            contentId={content.id}
            title={content.title}
            fromIdea={content.idea !== null}
          />
        </div>
        <StageControl
          contentId={content.id}
          title={content.title}
          stage={content.stage}
          stageChangedAt={content.stageChangedAt}
          posts={content.posts}
          now={now}
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="md:col-start-1">
          <ContentDetailForm content={content} options={options} />
        </div>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <ChecklistCard contentId={content.id} items={content.checklist} />
        </div>
        <div className="md:col-start-1">
          <PostVersions contentId={content.id} posts={content.posts} />
        </div>
      </div>
    </div>
  );
}
