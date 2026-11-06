import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { FollowerCard } from "@/features/home/components/follower-card";
import { FollowerReminder } from "@/features/home/components/follower-reminder";
import { IdeaBankBanner } from "@/features/home/components/idea-bank-banner";
import { PendingMetricsCard } from "@/features/home/components/pending-metrics-card";
import { PipelineCard } from "@/features/home/components/pipeline-card";
import { StaleContentsCard } from "@/features/home/components/stale-contents-card";
import { TodayTasksCard } from "@/features/home/components/today-tasks-card";
import { WeekProgressCard } from "@/features/home/components/week-progress-card";
import { getHomeOverview } from "@/features/home/queries";
import { formatWib } from "@/lib/date";

// Template "%s · Studio" dari layout tidak berlaku untuk page di segmen yang sama.
export const metadata: Metadata = { title: { absolute: "Beranda · Studio" } };

export default async function BerandaPage() {
  await requireAdmin();
  const now = new Date();
  const data = await getHomeOverview(now);

  return (
    <>
      <PageHeader
        title="Beranda"
        description={`Minggu ${formatWib(data.weekStart, "d MMMM yyyy")} · apa yang perlu dikerjakan`}
      />

      {/* Urutan DOM = urutan di HP: yang perlu dikerjakan dulu, kesehatan pipeline terakhir. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FollowerReminder
          platforms={data.followerReminders}
          latest={data.latestFollowers}
          className="md:col-span-2"
        />
        <WeekProgressCard
          target={data.target}
          progress={data.progress}
          streak={data.streak.current}
          items={data.weekItems}
        />
        <TodayTasksCard tasks={data.tasks} now={now} />
        <PendingMetricsCard items={data.pendingMetrics} total={data.pendingTotal} className="md:col-span-2" />
        {data.followerCards.map((card) => (
          <FollowerCard key={card.platform} card={card} domain={data.followerDomain} latest={data.latestFollowers} />
        ))}
        <IdeaBankBanner newCount={data.newIdeaCount} className="md:col-span-2" />
        <PipelineCard stageCounts={data.stageCounts} />
        <StaleContentsCard contents={data.staleContents} now={now} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">Saran otomatis hadir di Fase 5.</p>
    </>
  );
}
