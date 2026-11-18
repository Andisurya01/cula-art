"use client";

import Link from "next/link";
import type { Platform } from "@prisma/client";
import { ArrowRightLeft, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricStatusBadge } from "@/features/metrics/components/metric-status-badge";
import type { DecidingMetric, ExperimentVariant } from "@/lib/analytics/experiments";
import { formatWib } from "@/lib/date";
import { routes } from "@/lib/routes";
import type { PostCandidate, VariantPost } from "../derive";
import { formatMetricValue } from "../format";
import { decidingMetricLabel, VARIANT_ROLE_LABELS } from "../schema";
import { PostPickerDialog } from "./post-picker-dialog";
import { useExperimentPost } from "./use-experiment-post";

/** Post satu varian + nilai metrik penentu H+7 per post. `locked` = sudah disimpulkan (hanya baca). */
export function VariantPostsCard({
  experimentId,
  variant,
  description,
  platform,
  metric,
  posts,
  candidates,
  locked,
}: {
  experimentId: string;
  variant: ExperimentVariant;
  description: string;
  platform: Platform;
  metric: DecidingMetric;
  posts: readonly VariantPost[];
  candidates: readonly PostCandidate[];
  locked: boolean;
}) {
  const { pending, assign, remove } = useExperimentPost(experimentId);
  const other: ExperimentVariant = variant === "A" ? "B" : "A";
  const metricLabel = decidingMetricLabel(metric, platform);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          Varian {variant} <span className="font-normal text-muted-foreground">({VARIANT_ROLE_LABELS[variant]})</span>
        </CardTitle>
        <CardDescription className="[overflow-wrap:anywhere]">{description}</CardDescription>
        {!locked && (
          <CardAction>
            <PostPickerDialog
              experimentId={experimentId}
              variant={variant}
              platform={platform}
              candidates={candidates}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locked ? "Tidak ada post." : `Belum ada post. Tambahkan post tayang yang memakai ${description}.`}
          </p>
        ) : (
          <ul className="divide-y">
            {posts.map((post) => (
              <li key={post.postId} className="grid gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={routes.studio.post(post.postId)}
                      className="text-sm font-medium [overflow-wrap:anywhere] hover:underline"
                    >
                      {post.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {post.status ? (
                        <MetricStatusBadge status={post.status} />
                      ) : (
                        <Badge variant="destructive">Tidak tayang lagi</Badge>
                      )}
                      {post.postedAt && <span>{formatWib(post.postedAt, "d MMM yyyy")}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-xs text-muted-foreground">{metricLabel} H+7</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {post.value === null ? (post.postedAt ? "menunggu" : "—") : formatMetricValue(metric, post.value)}
                    </span>
                  </div>
                </div>
                {!locked && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.postedAt && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() => assign(post.postId, other)}
                        aria-label={`Pindahkan “${post.title}” ke varian ${other}`}
                      >
                        <ArrowRightLeft />
                        Pindah ke {other}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => remove(post.postId)}
                      aria-label={`Lepas “${post.title}” dari eksperimen`}
                    >
                      <Unlink />
                      Lepas
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
