import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendingMetric } from "@/lib/analytics/snapshots";
import { formatWib } from "@/lib/date";
import { routes } from "@/lib/routes";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { MetricFormButton } from "@/features/metrics/components/metric-form-dialog";
import { MetricStatusBadge } from "@/features/metrics/components/metric-status-badge";
import type { ScoredPost } from "@/features/metrics/queries";
import { METRIC_KIND_LABELS } from "@/features/metrics/schema";

/** Metrik tertunda (urutan dari `pendingMetrics`, H+1 lebih dulu), dengan tombol yang langsung membuka form H+1 atau H+7. */
export function PendingMetricsCard({
  items,
  total,
  className,
}: {
  items: readonly PendingMetric<ScoredPost>[];
  total: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Metrik tertunda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Semua metrik sudah terisi</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map(({ post, status, kind }) => (
              <li key={post.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={routes.studio.post(post.id)} className="block truncate font-medium hover:underline">
                    {post.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <PlatformBadge platform={post.platform} />
                    <MetricStatusBadge status={status} />
                    <span>{formatWib(post.postedAt, "d MMM yyyy")}</span>
                  </div>
                </div>
                <MetricFormButton
                  post={{ id: post.id, title: post.title, platform: post.platform }}
                  kind={kind}
                  snapshots={post.snapshots}
                  className="shrink-0"
                  aria-label={`Isi metrik ${METRIC_KIND_LABELS[kind]}: ${post.title}`}
                >
                  Isi {METRIC_KIND_LABELS[kind]}
                </MetricFormButton>
              </li>
            ))}
          </ul>
        )}
        {total > items.length && (
          <Button asChild variant="outline" size="sm">
            <Link href={`${routes.studio.posts}?status=PERLU`}>Lihat semua ({total})</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
