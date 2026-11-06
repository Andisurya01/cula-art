import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AnalyticsFrame } from "@/features/analytics/components/analytics-frame";
import { FollowerSection } from "@/features/analytics/components/follower-section";
import { KpiCards } from "@/features/analytics/components/kpi-cards";
import { PlatformComparison } from "@/features/analytics/components/platform-comparison";
import { RankingSection } from "@/features/analytics/components/ranking-section";
import { ScoreGroups } from "@/features/analytics/components/score-groups";
import { getAnalyticsData } from "@/features/analytics/queries";
import { analyticsHref, parseAnalyticsFilters } from "@/features/analytics/schema";
import { requireAdmin } from "@/features/auth/dal";
import { AccountSnapshotButton } from "@/features/metrics/components/account-snapshot-dialog";
import { MEDIUM_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Analitik" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const now = new Date();
  const filters = parseAnalyticsFilters(await searchParams);
  const { platform, days, medium } = filters;
  const data = await getAnalyticsData(filters, now);

  const hasPosts = data.kpi.totalPosts > 0;
  const mediumSelected = medium !== null;
  const label = PLATFORM_LABELS[platform];

  const followerSection = (
    <FollowerSection
      platform={platform}
      snapshots={data.followers}
      latest={data.latestFollowers}
      domain={data.domain}
      days={days}
      mediumSelected={mediumSelected}
    />
  );

  return (
    <>
      <PageHeader
        title="Analitik"
        description="Apa yang berhasil per platform. Angka TikTok dan Instagram tidak pernah dicampur."
        actions={<AccountSnapshotButton latest={data.latestFollowers}>Catat followers</AccountSnapshotButton>}
      />

      <AnalyticsFrame filters={filters}>
        {hasPosts ? (
          <>
            {medium && (
              <p className="text-xs text-muted-foreground">
                Hanya konten bermedium {MEDIUM_LABELS[medium]}, dari proyek atau ide asalnya. Konten tanpa medium tidak
                ikut.
              </p>
            )}
            <KpiCards
              kpi={data.kpi}
              target={data.target}
              currentFollowers={data.currentFollowers}
              days={days}
              mediumSelected={mediumSelected}
            />
            {followerSection}
            <ScoreGroups platform={platform} groups={data.groups} scoredCount={data.scoredCount} />
            <RankingSection platform={platform} top={data.ranking.top} bottom={data.ranking.bottom} />
          </>
        ) : (
          <>
            <EmptyState
              icon={BarChart3}
              title={
                medium
                  ? `Tidak ada post ${label} bermedium ${MEDIUM_LABELS[medium]} dalam ${days} hari terakhir`
                  : `Belum ada post ${label} yang tayang dalam ${days} hari terakhir`
              }
              description={
                medium
                  ? "Medium diambil dari proyek atau ide asal konten. Konten tanpa keduanya hanya muncul saat Semua medium."
                  : "Analitik terisi setelah ada konten yang tayang. Pindahkan konten ke Posted di Pipeline, lalu isi metrik H+1 dan H+7 di Postingan."
              }
              action={
                <Button asChild variant="outline">
                  {medium ? (
                    <Link href={analyticsHref({ ...filters, medium: null })}>Tampilkan semua medium</Link>
                  ) : (
                    <Link href={routes.studio.pipeline}>Buka Pipeline</Link>
                  )}
                </Button>
              }
            />
            {/* Followers tidak bergantung pada post: snapshot yang sudah dicatat tetap terlihat dan bisa dihapus. */}
            {data.followers.length > 0 && followerSection}
          </>
        )}

        {/* Satu post di platform lain tetap bisa membawa konten ini masuk rentang. */}
        {(hasPosts || data.comparison.length > 0) && <PlatformComparison rows={data.comparison} />}
      </AnalyticsFrame>
    </>
  );
}
