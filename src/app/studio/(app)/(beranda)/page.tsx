import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { motionIndex } from "@/components/motion/motion-utils";
import { Reveal } from "@/components/motion/reveal";
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
import { cn } from "@/lib/utils";

// Template "%s · Studio" dari layout tidak berlaku untuk page di segmen yang sama.
export const metadata: Metadata = { title: { absolute: "Beranda · Studio" } };

/**
 * Kartu layar pertama masuk berjeda singkat saat halaman tampil (CSS murni, Fase 7): `motion-enter` +
 * `--motion-i`. Isi selalu ada di HTML; tanpa JS, tingkat Mati, atau kurangi gerakan kartu langsung diam.
 */
const ENTER = "motion-enter";

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
        Gerak (Fase 7): kartu sampai Saran masuk berjeda saat halaman tampil; kartu sesudahnya biasanya di
        bawah layar pertama, jadi muncul saat di-scroll (`Reveal`, pembungkus = sel grid, kartu `h-full`).
      */}
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          <WeeklyReviewReminder
            reminder={data.reviewReminder}
            className={cn("col-span-full", ENTER)}
            style={motionIndex(0)}
          />
          <FollowerReminder
            platforms={data.followerReminders}
            latest={data.latestFollowers}
            className={cn("col-span-full", ENTER)}
            style={motionIndex(1)}
          />
          <WeekProgressCard
            target={data.target}
            progress={data.progress}
            items={data.weekItems}
            className={cn("@xl:col-span-2", ENTER)}
            style={motionIndex(2)}
          />
          <StreakCard streak={data.streak.current} className={ENTER} style={motionIndex(3)} />
          <TodayTasksCard tasks={data.tasks} now={now} className={ENTER} style={motionIndex(4)} />
          <SuggestionsCard
            suggestions={data.suggestions}
            className={cn("min-w-0 @xl:col-span-2", ENTER)}
            style={motionIndex(5)}
          />
          <Reveal className="col-span-full">
            <PendingMetricsCard items={data.pendingMetrics} total={data.pendingTotal} className="h-full" />
          </Reveal>
          {data.followerCards.map((card) => (
            <Reveal key={card.platform} className="min-w-0">
              <FollowerCard
                card={card}
                domain={data.followerDomain}
                latest={data.latestFollowers}
                className="h-full min-w-0"
              />
            </Reveal>
          ))}
          <Reveal>
            <PipelineCard stageCounts={data.stageCounts} className="h-full" />
          </Reveal>
          <Reveal className="min-w-0 @4xl:col-span-full">
            <StaleContentsCard contents={data.staleContents} now={now} className="h-full min-w-0" />
          </Reveal>
          <IdeaBankBanner newCount={data.newIdeaCount} className="col-span-full" />
        </div>
      </div>
    </>
  );
}
