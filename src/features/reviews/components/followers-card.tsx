import { Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { AccountSnapshotButton, type LatestFollowers } from "@/features/metrics/components/account-snapshot-dialog";
import { formatCount } from "@/features/metrics/format";

/** Flow 5 langkah 3: isi followers terbaru per platform (dialog yang sama dengan Postingan). */
export function FollowersCard({ latest }: { latest: readonly LatestFollowers[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot followers</CardTitle>
        <CardDescription>
          Isi di akhir minggu supaya followers bertambah minggu ini bisa dihitung per platform.
        </CardDescription>
        <CardAction>
          <AccountSnapshotButton latest={latest}>
            <Users />
            Isi followers
          </AccountSnapshotButton>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2">
          {latest.map((item) => (
            <div key={item.platform} className="min-w-0 rounded-card-nested bg-muted px-4 py-3">
              <dt className="text-xs text-muted-foreground">{PLATFORM_LABELS[item.platform]}</dt>
              <dd className="mt-1 font-heading text-h5 tabular-nums">{formatCount(item.followers)}</dd>
              <dd className="text-xs text-muted-foreground">
                {item.date ? `Terakhir ${formatWib(item.date, "d MMM yyyy")}` : "Belum pernah dicatat"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
