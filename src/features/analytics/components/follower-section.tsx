import type { Platform } from "@prisma/client";
import { SERIES_COLORS } from "@/components/charts/chart-theme";
import { TimeLineChart } from "@/components/charts/time-line-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/labels";
import { AccountSnapshotButton } from "@/features/metrics/components/account-snapshot-dialog";
import type { FollowerSnapshotRow, LatestFollowerSnapshot } from "@/features/metrics/queries";
import { FollowerHistory } from "./follower-history";
import { FOLLOWERS_MEDIUM_NOTE } from "./kpi-cards";
import { SectionEmpty } from "./section-parts";

/** Grafik garis followers platform aktif + riwayat snapshot. Satu seri, jadi tanpa legend. */
export function FollowerSection({
  platform,
  snapshots,
  latest,
  domain,
  days,
  mediumSelected,
}: {
  platform: Platform;
  snapshots: readonly FollowerSnapshotRow[];
  latest: readonly LatestFollowerSnapshot[];
  domain: readonly [number, number];
  days: number;
  mediumSelected: boolean;
}) {
  const label = PLATFORM_LABELS[platform];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Followers {label}</CardTitle>
        <CardDescription>
          Dari snapshot yang kamu catat, {days} hari terakhir.{mediumSelected && ` ${FOLLOWERS_MEDIUM_NOTE}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <SectionEmpty
            action={<AccountSnapshotButton latest={latest}>Catat followers</AccountSnapshotButton>}
          >
            Belum ada snapshot followers {label} di rentang ini. Salin jumlah followers dari aplikasi {label} lewat
            tombol di bawah, cukup seminggu sekali.
          </SectionEmpty>
        ) : (
          <>
            <TimeLineChart
              data={snapshots.map((snapshot) => ({ t: snapshot.date.getTime(), value: snapshot.followers }))}
              color={SERIES_COLORS[platform]}
              valueLabel="Followers"
              ariaLabel={`Followers ${label}, ${days} hari terakhir`}
              domain={domain}
              showTable={false}
            />
            {snapshots.length === 1 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Baru satu snapshot. Garis muncul setelah snapshot kedua.
              </p>
            )}
            <FollowerHistory snapshots={snapshots} platformLabel={label} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
