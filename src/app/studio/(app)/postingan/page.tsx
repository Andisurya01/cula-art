import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { AccountSnapshotButton } from "@/features/metrics/components/account-snapshot-dialog";
import { PostFiltersBar } from "@/features/metrics/components/post-filters-bar";
import { PostPagination } from "@/features/metrics/components/post-pagination";
import { PostTable } from "@/features/metrics/components/post-table";
import {
  filterPosts,
  paginate,
  parsePostFilters,
  parsePostPage,
  pillarOptions,
} from "@/features/metrics/post-filters";
import { getLatestFollowerSnapshots, getScoredPosts } from "@/features/metrics/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Postingan" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [posts, latestFollowers] = await Promise.all([getScoredPosts(), getLatestFollowerSnapshots()]);

  const pillars = pillarOptions(posts);
  const filters = parsePostFilters(
    params,
    pillars.map((pillar) => pillar.id),
  );
  const filtered = filterPosts(posts, filters);
  const { items, page, pageCount } = paginate(filtered, parsePostPage(params));

  return (
    <>
      <PageHeader
        title="Postingan"
        description="Post yang sudah tayang dan metrik H+1 / H+7 per platform."
        actions={<AccountSnapshotButton latest={latestFollowers}>Snapshot followers</AccountSnapshotButton>}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada post yang tayang"
          description="Post muncul di sini setelah kontennya dipindahkan ke Posted di Pipeline. Saat itu isi URL dan waktu posting per platform, lalu metrik H+1 dan H+7 bisa dicatat dari halaman ini."
          action={
            <Button asChild variant="outline">
              <Link href={routes.studio.pipeline}>Buka Pipeline</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          <PostFiltersBar filters={filters} pillars={pillars} />
          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Tidak ada post yang cocok"
              description="Ubah filter, atau tampilkan semua post."
              action={
                <Button asChild variant="outline">
                  <Link href={routes.studio.posts}>Tampilkan semua post</Link>
                </Button>
              }
            />
          ) : (
            <>
              <PostTable posts={items} />
              <PostPagination filters={filters} page={page} pageCount={pageCount} />
            </>
          )}
        </div>
      )}
    </>
  );
}
