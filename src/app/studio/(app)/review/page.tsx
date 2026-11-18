import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/features/auth/dal";
import { FollowersCard } from "@/features/reviews/components/followers-card";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { ReviewHistory } from "@/features/reviews/components/review-history";
import { SummaryCard } from "@/features/reviews/components/summary-card";
import { WeekNav } from "@/features/reviews/components/week-nav";
import { getReviewPageData } from "@/features/reviews/queries";
import { summaryNumbersDiffer } from "@/features/reviews/summary";
import { parseReviewWeek, REVIEW_WEEK_PARAM, reviewWeekNav, weekRangeLabel } from "@/features/reviews/week";
import { formatWib } from "@/lib/date";

export const metadata: Metadata = { title: "Review Mingguan" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const now = new Date();
  const weekStart = parseReviewWeek(params[REVIEW_WEEK_PARAM], now);
  const nav = reviewWeekNav(weekStart, now);
  const { saved, live, history, latestFollowers, plan } = await getReviewPageData(weekStart, now);
  const frozen = saved?.frozen ?? null;

  return (
    <>
      <PageHeader
        title="Review Mingguan"
        description={`Minggu ${weekRangeLabel(weekStart)} (Senin-Minggu WIB)`}
        actions={
          saved ? (
            <Badge variant="secondary">
              <CheckCircle2 />
              Tersimpan {formatWib(saved.updatedAt, "d MMM, HH.mm")}
            </Badge>
          ) : (
            <Badge variant="outline">
              <CircleDashed />
              Belum di-review
            </Badge>
          )
        }
      />

      <div className="grid gap-4">
        <WeekNav nav={nav} />

        {frozen ? (
          <SummaryCard
            data={frozen}
            frozenAt={new Date(frozen.frozenAt)}
            changed={summaryNumbersDiffer(frozen, live.data)}
            isCurrentWeek={nav.isCurrentWeek}
          />
        ) : (
          <SummaryCard
            data={live.data}
            frozenAt={null}
            suggestions={live.suggestions}
            isCurrentWeek={nav.isCurrentWeek}
          />
        )}

        <FollowersCard latest={latestFollowers} />

        <ReviewForm
          key={nav.key}
          weekKey={nav.key}
          saved={
            saved && {
              wins: saved.wins,
              repeat: saved.repeat,
              stop: saved.stop,
              focusNext: saved.focusNext,
              plannedContentIds: plan.savedIds,
            }
          }
          plan={{
            weekLabel: weekRangeLabel(plan.weekStart, { short: true }),
            editable: plan.editable,
            options: plan.options,
            slots: plan.slots,
            now,
          }}
        />

        <ReviewHistory items={history} currentKey={nav.key} />
      </div>
    </>
  );
}
