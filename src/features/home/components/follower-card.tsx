import { SERIES_COLORS } from "@/components/charts/chart-theme";
import { TimeLineChart } from "@/components/charts/time-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/labels";
import { AccountSnapshotButton, type LatestFollowers } from "@/features/metrics/components/account-snapshot-dialog";
import { formatCount, formatSigned } from "@/features/metrics/format";
import { FOLLOWER_RANGE_DAYS, type FollowerCardData } from "../derive";

/** Grafik mini followers satu platform. Angka dan garis TikTok dan Instagram tidak pernah digabung. */
export function FollowerCard({
  card,
  domain,
  latest,
}: {
  card: FollowerCardData;
  domain: readonly [number, number];
  latest: readonly LatestFollowers[];
}) {
  const label = PLATFORM_LABELS[card.platform];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Followers {label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {card.latest === null ? (
          <>
            <p className="text-sm text-muted-foreground">
              Belum ada snapshot dalam {FOLLOWER_RANGE_DAYS} hari terakhir. Catat followers {label} supaya grafiknya
              mulai terisi.
            </p>
            <AccountSnapshotButton latest={latest}>Isi snapshot followers</AccountSnapshotButton>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-3xl font-semibold">{formatCount(card.latest)}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{formatSigned(card.gained)}</span>{" "}
                {FOLLOWER_RANGE_DAYS} hari
              </p>
            </div>
            <TimeLineChart
              compact
              height={96}
              data={card.points}
              color={SERIES_COLORS[card.platform]}
              domain={domain}
              valueLabel={`Followers ${label}`}
              ariaLabel={`Followers ${label} ${FOLLOWER_RANGE_DAYS} hari terakhir`}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
