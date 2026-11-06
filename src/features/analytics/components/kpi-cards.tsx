import { Card, CardContent } from "@/components/ui/card";
import type { Kpi } from "@/lib/analytics/kpi";
import { formatCount, formatPercent, formatPerWeek, formatSigned } from "@/features/metrics/format";
import { erTargetNote, followerTargetNote, type PlatformTarget } from "../targets";

export const FOLLOWERS_MEDIUM_NOTE = "Followers tidak terpengaruh filter medium.";

function KpiCard({ label, value, notes }: { label: string; value: string; notes: (string | null | false)[] }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {notes.map(
          (note) =>
            note && (
              <p key={note} className="text-xs text-muted-foreground">
                {note}
              </p>
            ),
        )}
      </CardContent>
    </Card>
  );
}

/** KPI platform aktif saja. Pembanding target hanya jika sudah diisi (D11). */
export function KpiCards({
  kpi,
  target,
  currentFollowers,
  days,
  mediumSelected,
}: {
  kpi: Kpi;
  target: PlatformTarget;
  currentFollowers: number | null;
  days: number;
  mediumSelected: boolean;
}) {
  return (
    <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Total post"
        value={formatCount(kpi.totalPosts)}
        notes={[`${formatCount(kpi.measuredPosts)} sudah punya metrik`]}
      />
      <KpiCard
        label="Rata-rata ER"
        value={formatPercent(kpi.averageEr)}
        notes={[kpi.averageEr === null && "Isi metrik di Postingan", erTargetNote(target.er)]}
      />
      <KpiCard
        label="Followers bertambah"
        value={formatSigned(kpi.followersGained)}
        notes={[
          kpi.followersGained === null && "Butuh minimal 2 snapshot di rentang ini",
          followerTargetNote(target.followers, currentFollowers),
          mediumSelected && FOLLOWERS_MEDIUM_NOTE,
        ]}
      />
      <KpiCard
        label="Post per minggu"
        value={formatPerWeek(kpi.postsPerWeek)}
        notes={[`Rata-rata ${days} hari terakhir`]}
      />
    </section>
  );
}
