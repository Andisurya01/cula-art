import { Card, CardContent, type CardVariant } from "@/components/ui/card";
import type { Kpi } from "@/lib/analytics/kpi";
import { formatCount, formatPercent, formatPerWeek, formatSigned } from "@/features/metrics/format";
import { erTargetNote, followerTargetNote, type PlatformTarget } from "../targets";

export const FOLLOWERS_MEDIUM_NOTE = "Followers tidak terpengaruh filter medium.";

/**
 * Kartu KPI gaya bento. Aksen hanya gelap dan lime: biru dan oranye dipakai warna seri platform di
 * grafik, jadi tidak dipakai di sini supaya tidak terbaca sebagai TikTok/Instagram.
 */
function KpiCard({
  label,
  value,
  notes,
  tone = "default",
}: {
  label: string;
  value: string;
  notes: (string | null | false)[];
  tone?: Extract<CardVariant, "default" | "dark" | "lime">;
}) {
  return (
    <Card size="sm" variant={tone} className="min-w-0">
      <CardContent className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-auto pt-3 font-heading text-h3 break-words tabular-nums">{value}</p>
        {notes.map(
          (note) =>
            note && (
              <p key={note} className="text-xs text-muted-foreground group-data-[tone=bento]/card:text-current">
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
        tone="dark"
        label="Total post"
        value={formatCount(kpi.totalPosts)}
        notes={[`${formatCount(kpi.measuredPosts)} sudah punya metrik`]}
      />
      <KpiCard
        tone="lime"
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
