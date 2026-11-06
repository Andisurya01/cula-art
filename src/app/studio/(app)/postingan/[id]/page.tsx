import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { MetricStatusBadge } from "@/features/metrics/components/metric-status-badge";
import { PostComputedCard } from "@/features/metrics/components/post-computed-card";
import { PostSnapshotCard } from "@/features/metrics/components/post-snapshot-card";
import { getScoredPost } from "@/features/metrics/queries";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const post = await getScoredPost(id);
  return { title: post ? `${post.title} (${PLATFORM_LABELS[post.platform]})` : "Post tidak ditemukan" };
}

export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const post = await getScoredPost(id);
  if (!post) notFound();

  return (
    <div className="grid gap-4">
      <Link
        href={routes.studio.posts}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Postingan
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere] md:text-2xl">
            {post.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <PlatformBadge platform={post.platform} full />
            <PillarBadge name={post.pillar.name} color={post.pillar.color} className="max-w-full min-w-0" />
            <MetricStatusBadge status={post.status} />
            <span>Tayang {formatWib(post.postedAt, "d MMM yyyy, HH.mm")} WIB</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.url && (
            <Button asChild variant="outline" size="sm">
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Lihat post asli
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={routes.studio.content(post.contentId)}>
              <FileText />
              Buka konten
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <PostSnapshotCard post={post} kind="H1" />
        <PostSnapshotCard post={post} kind="H7" />
      </div>

      <PostComputedCard post={post} />
    </div>
  );
}
