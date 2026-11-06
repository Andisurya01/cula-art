import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_COMPARISON_POSTS } from "@/lib/analytics/scoring";
import { PLATFORM_LABELS, VIEWS_LABELS } from "@/lib/labels";
import {
  EMPTY_VALUE,
  formatFollowRate,
  formatPercent,
  formatRelative,
  formatScore,
} from "../format";
import type { ScoredPost } from "../queries";
import { compareToBaseline } from "./baseline-comparison";
import { SnapshotKindMark } from "./metric-status-badge";

function sourceNote(post: ScoredPost): string {
  if (!post.best) return "Belum ada snapshot. Angka muncul setelah H+1 atau H+7 diisi.";
  return post.best.kind === "H1"
    ? "Dihitung dari snapshot H+1, karena H+7 belum diisi."
    : "Dihitung dari snapshot H+7.";
}

/** Angka terhitung + perbandingan terhadap median. Penanda D5 di setiap angka yang memakai H+1. */
export function PostComputedCard({ post }: { post: ScoredPost }) {
  const viewsLabel = VIEWS_LABELS[post.platform].toLowerCase();
  const mark = post.best ? <SnapshotKindMark kind={post.best.kind} /> : null;

  const stats = [
    { label: "ER", value: formatPercent(post.er) },
    { label: "Save rate", value: formatPercent(post.saveRate) },
    { label: "Share rate", value: formatPercent(post.shareRate) },
    { label: `Follow rate (per 1.000 ${viewsLabel})`, value: formatFollowRate(post.followRate) },
    { label: "Skor", value: formatScore(post.score) },
    { label: "Skor relatif", value: formatRelative(post.relativeScore) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Angka terhitung</CardTitle>
        <CardDescription>{sourceNote(post)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold">
                {stat.value}
                {stat.value !== EMPTY_VALUE && mark}
              </dd>
            </div>
          ))}
        </dl>
        <BaselineSummary post={post} mark={mark} />
      </CardContent>
    </Card>
  );
}

function BaselineSummary({ post, mark }: { post: ScoredPost; mark: React.ReactNode }) {
  const { headline, detail } = describeBaseline(post);
  return (
    <section aria-label="Perbandingan terhadap median" className="grid gap-0.5 border-t pt-3">
      <h2 className="text-xs text-muted-foreground">Dibanding median post sebelumnya</h2>
      <p className="flex items-center gap-1.5 text-lg font-semibold">
        {headline}
        {headline !== EMPTY_VALUE && mark}
      </p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </section>
  );
}

function describeBaseline(post: ScoredPost): { headline: string; detail: string } {
  const comparison = compareToBaseline(post);
  const platform = PLATFORM_LABELS[post.platform];
  const baseline = `median ${formatScore(post.baselineMedian)} dari ${post.baselineCount} post sebelumnya di ${platform}`;
  const score = formatScore(post.score);

  switch (comparison.kind) {
    case "NOT_ENOUGH":
      return {
        headline: EMPTY_VALUE,
        detail: `Butuh minimal ${MIN_COMPARISON_POSTS} post sebelumnya di platform yang sama. Saat ini ada ${post.baselineCount} post ${platform} sebelumnya yang punya metrik.`,
      };
    case "NO_SCORE":
      return {
        headline: EMPTY_VALUE,
        detail: `Isi metrik post ini untuk membandingkannya dengan ${baseline}.`,
      };
    case "SAME":
      return {
        headline: "Sama dengan median",
        detail: `Skor post ini ${score}, sama dengan ${baseline}.`,
      };
    case "HIGHER":
    case "LOWER": {
      const direction = comparison.kind === "HIGHER" ? "lebih tinggi" : "lebih rendah";
      return {
        headline:
          comparison.percent === null
            ? direction.charAt(0).toUpperCase() + direction.slice(1)
            : `${formatPercent(comparison.percent)} ${direction}`,
        detail: `Skor post ini ${score}, ${direction} dari ${baseline}.`,
      };
    }
  }
}
