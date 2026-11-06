import Link from "next/link";
import type { Platform } from "@prisma/client";
import { SERIES_COLORS } from "@/components/charts/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS, VIEWS_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { SnapshotKindMark } from "@/features/metrics/components/metric-status-badge";
import { formatCount, formatPercent, formatRelative } from "@/features/metrics/format";
import type { ComparisonRow, ComparisonSide } from "../select-posts";
import { SectionEmpty } from "./section-parts";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function PlatformColumn({ platform, side }: { platform: Platform; side: ComparisonSide }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium">
        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[platform] }} />
        <Link href={routes.studio.post(side.postId)} className="hover:underline">
          {PLATFORM_LABELS[platform]}
        </Link>
        {side.kind && <SnapshotKindMark kind={side.kind} />}
      </div>
      <dl className="grid gap-0.5 text-xs">
        <Metric label={VIEWS_LABELS[platform]} value={formatCount(side.views)} />
        <Metric label="ER" value={formatPercent(side.er)} />
        <Metric label="Skor relatif" value={formatRelative(side.relativeScore)} />
      </dl>
    </div>
  );
}

/**
 * Satu-satunya bagian yang menampilkan dua platform. Angka hanya berdampingan di kolom platformnya
 * sendiri: tanpa total, tanpa rata-rata gabungan, tanpa selisih antar-platform.
 */
export function PlatformComparison({ rows }: { rows: readonly ComparisonRow[] }) {
  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>TikTok vs Instagram untuk konten yang sama</CardTitle>
        <CardDescription>
          Bagian ini memang menampilkan dua platform dan tidak mengikuti tab; rentang dan medium tetap berlaku.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <SectionEmpty>
            Belum ada konten yang tayang di kedua platform dan sudah punya metrik di keduanya pada rentang ini. Tambah
            versi platform di detail konten, lalu isi metrik keduanya di Postingan.
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.contentId}
                className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-6"
              >
                <Link
                  href={routes.studio.content(row.contentId)}
                  className="min-w-0 font-medium break-words hover:underline"
                >
                  {row.title}
                </Link>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <PlatformColumn platform="TIKTOK" side={row.tiktok} />
                  <PlatformColumn platform="INSTAGRAM" side={row.instagram} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
