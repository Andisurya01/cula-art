import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricKind } from "@/lib/analytics/snapshots";
import { formatWib } from "@/lib/date";
import { VIEWS_LABELS } from "@/lib/labels";
import { formatCount, formatPercent, formatSeconds } from "../format";
import type { ScoredPost } from "../queries";
import { METRIC_KIND_LABELS } from "../schema";
import { DeleteSnapshotButton } from "./delete-snapshot-button";
import { MetricFormButton } from "./metric-form-dialog";

/** Satu snapshot H+1 atau H+7: semua angka + ubah/hapus, atau tombol isi jika belum ada. */
export function PostSnapshotCard({ post, kind }: { post: ScoredPost; kind: MetricKind }) {
  const snapshot = post.snapshots.find((item) => item.kind === kind);
  const label = METRIC_KIND_LABELS[kind];
  const formPost = { id: post.id, title: post.title, platform: post.platform };

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snapshot {label}</CardTitle>
          <CardDescription>Belum diisi</CardDescription>
        </CardHeader>
        <CardContent>
          <MetricFormButton post={formPost} kind={kind} snapshots={post.snapshots} variant="default">
            Isi {label}
          </MetricFormButton>
        </CardContent>
      </Card>
    );
  }

  const rows = [
    { name: VIEWS_LABELS[post.platform], value: formatCount(snapshot.views) },
    { name: "Likes", value: formatCount(snapshot.likes) },
    { name: "Komentar", value: formatCount(snapshot.comments) },
    { name: "Shares", value: formatCount(snapshot.shares) },
    { name: "Saves", value: formatCount(snapshot.saves) },
    { name: "Followers dari post", value: formatCount(snapshot.follows) },
    { name: "Rata-rata tonton", value: formatSeconds(snapshot.avgWatchSec) },
    { name: "Completion rate", value: formatPercent(snapshot.completionRate) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot {label}</CardTitle>
        <CardDescription>
          Dicatat {formatWib(snapshot.recordedAt, "d MMM yyyy, HH.mm")} WIB
          {post.best?.kind === kind && " · dipakai untuk angka terhitung"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="grid gap-1.5">
          {rows.map((row) => (
            <div key={row.name} className="flex items-baseline justify-between gap-3">
              <dt className="min-w-0 text-muted-foreground">{row.name}</dt>
              <dd className="font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <MetricFormButton
            post={formPost}
            kind={kind}
            snapshots={post.snapshots}
            aria-label={`Ubah snapshot ${label}`}
          >
            Ubah
          </MetricFormButton>
          <DeleteSnapshotButton snapshotId={snapshot.id} kindLabel={label} postTitle={post.title} />
        </div>
      </CardContent>
    </Card>
  );
}
