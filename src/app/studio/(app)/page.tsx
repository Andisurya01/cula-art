import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { FollowerCard } from "@/features/home/components/follower-card";
import { FollowerReminder } from "@/features/home/components/follower-reminder";
import { IdeaBankBanner } from "@/features/home/components/idea-bank-banner";
import { PendingMetricsCard } from "@/features/home/components/pending-metrics-card";
import { PipelineCard } from "@/features/home/components/pipeline-card";
import { StaleContentsCard } from "@/features/home/components/stale-contents-card";
import { StreakCard } from "@/features/home/components/streak-card";
import { SuggestionsCard } from "@/features/home/components/suggestions-card";
import { TodayTasksCard } from "@/features/home/components/today-tasks-card";
import { WeekProgressCard } from "@/features/home/components/week-progress-card";
import { WeeklyReviewReminder } from "@/features/home/components/weekly-review-reminder";
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

      {/*
        Bento: kolom mengikuti lebar area isi (container query), bukan lebar layar, karena sidebar
        memakan ruang mulai 768 px. 1 kolom < 576 px, 2 kolom, lalu 3 kolom ≥ 896 px.
        Urutan DOM = urutan di HP: pengingat, lalu progres, streak, dan tugas hari ini, lalu saran (apa
        yang dikerjakan berikutnya), metrik tertunda, grafik mini followers, dan kesehatan pipeline terakhir.
      */}
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          <WeeklyReviewReminder reminder={data.reviewReminder} className="col-span-full" />
          <FollowerReminder
            platforms={data.followerReminders}
            latest={data.latestFollowers}
            className="col-span-full"
          />
          <WeekProgressCard
            target={data.target}
            progress={data.progress}
            items={data.weekItems}
            className="@xl:col-span-2"
          />
          <StreakCard streak={data.streak.current} />
          <TodayTasksCard tasks={data.tasks} now={now} />
          <SuggestionsCard suggestions={data.suggestions} className="min-w-0 @xl:col-span-2" />
          <PendingMetricsCard items={data.pendingMetrics} total={data.pendingTotal} className="col-span-full" />
          {data.followerCards.map((card) => (
            <FollowerCard
              key={card.platform}
              card={card}
              domain={data.followerDomain}
              latest={data.latestFollowers}
              className="min-w-0"
            />
          ))}
          <PipelineCard stageCounts={data.stageCounts} />
          <StaleContentsCard contents={data.staleContents} now={now} className="min-w-0 @4xl:col-span-full" />
          <IdeaBankBanner newCount={data.newIdeaCount} className="col-span-full" />
        </div>
      </div>
    </>
  );
}
