import Link from "next/link";
import type { Platform } from "@prisma/client";
import { Hourglass, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DecidingMetric, ExperimentComparison, VariantStats } from "@/lib/analytics/experiments";
import { routes } from "@/lib/routes";
import { PROPOSAL_DISCLAIMER, proposalReasonText, waitingH7Text } from "../copy";
import type { VariantPost } from "../derive";
import { formatDiffPercent, formatMetricValue } from "../format";
import { decidingMetricLabel, EXPERIMENT_RESULT_LABELS } from "../schema";
import { ExperimentResultBadge } from "./experiment-result-badge";

/**
 * Perbandingan A vs B dari angka H+7 saja (E7): median per varian, nilai per post, selisih %, dan usulan.
 * Sebelum semua post punya H+7 hanya tampil "menunggu H+7 untuk N post".
 */
export function ComparisonCard({
  comparison,
  metric,
  platform,
  posts,
  excludedCount,
}: {
  comparison: ExperimentComparison;
  metric: DecidingMetric;
  platform: Platform;
  posts: readonly VariantPost[];
  excludedCount: number;
}) {
  const metricLabel = decidingMetricLabel(metric, platform);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perbandingan</CardTitle>
        <CardDescription>Median {metricLabel} H+7 per varian. Angka H+1 tidak dipakai.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {comparison.status === "EMPTY" && (
          <p className="text-sm text-muted-foreground">
            Tambahkan post tayang ke varian A dan B. Perbandingan tampil setelah semua post punya metrik H+7.
          </p>
        )}

        {comparison.status === "WAITING_H7" && (
          <WaitingSection
            waitingCount={comparison.waitingCount}
            total={comparison.total}
            posts={posts.filter((p) => p.postedAt !== null && p.value === null)}
          />
        )}

        {comparison.status === "READY" && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MedianStat variant="A" stats={comparison.a} metric={metric} />
              <MedianStat variant="B" stats={comparison.b} metric={metric} />
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <dt className="text-xs text-muted-foreground">Selisih B vs A</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatDiffPercent(comparison.diffPercent)}</dd>
                {comparison.diffPercent === null && (
                  <dd className="text-xs text-muted-foreground">Median A 0 atau kosong, jadi persen tidak bisa dihitung.</dd>
                )}
              </div>
            </dl>

            <section aria-label="Usulan otomatis" className="grid gap-1.5 rounded-lg bg-muted/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">Usulan otomatis</h3>
                <ExperimentResultBadge result={comparison.proposal} />
              </div>
              <p className="text-sm">
                {EXPERIMENT_RESULT_LABELS[comparison.proposal]}: {proposalReasonText(comparison.reason)}
              </p>
              <p className="text-xs text-muted-foreground">{PROPOSAL_DISCLAIMER}</p>
            </section>
          </>
        )}

        {excludedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {excludedCount} post tidak ikut dihitung karena sudah tidak tayang. Lepas post itu dari eksperimen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MedianStat({ variant, stats, metric }: { variant: "A" | "B"; stats: VariantStats; metric: DecidingMetric }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Scale className="size-3" aria-hidden />
        Median {variant} ({stats.count} post)
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatMetricValue(metric, stats.median)}</dd>
      {stats.values.length > 0 && (
        <dd className="text-xs text-muted-foreground tabular-nums [overflow-wrap:anywhere]">
          {stats.values.map((v) => formatMetricValue(metric, v.value)).join(" · ")}
        </dd>
      )}
    </div>
  );
}

function WaitingSection({
  waitingCount,
  total,
  posts,
}: {
  waitingCount: number;
  total: number;
  posts: readonly VariantPost[];
}) {
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Hourglass className="size-4 text-muted-foreground" aria-hidden />
        {waitingH7Text(waitingCount)}
      </p>
      <p className="text-sm text-muted-foreground">
        Perbandingan tampil setelah semua {total} post punya metrik H+7 (sudah {total - waitingCount}). Isi H+7 dari
        detail post.
      </p>
      {posts.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {posts.map((post) => (
            <li key={post.postId} className="[overflow-wrap:anywhere]">
              <span className="text-muted-foreground">{post.variant}:</span>{" "}
              <Link href={routes.studio.post(post.postId)} className="hover:underline">
                {post.title}
              </Link>
              {post.h1Only && <span className="text-xs text-muted-foreground"> (baru H+1)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
