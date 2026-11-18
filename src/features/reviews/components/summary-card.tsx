import Link from "next/link";
import { CheckCircle2, History, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { EMPTY_VALUE, formatCount, formatRelative, formatSigned } from "@/features/metrics/format";
import type { SuggestionView } from "@/features/suggestions/copy";
import { SuggestionList } from "@/features/suggestions/components/suggestion-list";
import { platformData, type ReviewPlatformData, type ReviewSummaryData } from "../summary";

/**
 * Ringkasan otomatis (E8). Tanpa `frozenAt` = angka terkini + saran aktif yang bisa ditindaklanjuti;
 * dengan `frozenAt` = ringkasan yang dibekukan saat review disimpan (saran berupa teks saat itu).
 * TikTok dan Instagram selalu di kartu terpisah: angkanya tidak pernah digabung.
 */
export function SummaryCard({
  data,
  frozenAt,
  suggestions,
  changed = false,
  isCurrentWeek = false,
}: {
  data: ReviewSummaryData;
  frozenAt: Date | null;
  /** Saran aktif sekarang (hanya untuk ringkasan terkini). */
  suggestions?: readonly SuggestionView[];
  /** Angka terkini sudah berbeda dari yang dibekukan. */
  changed?: boolean;
  isCurrentWeek?: boolean;
}) {
  const shortBy = Math.max(0, data.target - data.postedCount);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan otomatis</CardTitle>
        <CardDescription>
          {frozenAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Snowflake className="size-3.5" />
              Dibekukan saat disimpan, {formatWib(frozenAt, "d MMM yyyy, HH.mm")} WIB.
            </span>
          ) : isCurrentWeek ? (
            "Angka terkini; minggu ini masih berjalan. Dibekukan saat review disimpan."
          ) : (
            "Angka terkini. Dibekukan saat review disimpan."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {changed && (
          <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <History className="mt-0.5 size-3.5 shrink-0" />
            Angka terbaru sudah berbeda dari ringkasan ini (mis. metrik atau followers baru). Simpan ulang review
            untuk membekukan angka terbaru.
          </p>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-3xl font-semibold">
            {data.postedCount}
            <span className="text-base font-normal text-muted-foreground"> dari {data.target} konten tayang</span>
          </p>
          {data.target === 0 ? (
            <Link href={routes.studio.settings} className="text-xs text-muted-foreground underline">
              Target mingguan belum diatur
            </Link>
          ) : data.targetMet ? (
            <Badge variant="secondary">
              <CheckCircle2 />
              Target tercapai
            </Badge>
          ) : (
            <Badge variant="outline">Kurang {shortBy} konten</Badge>
          )}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Satu konten yang tayang di TikTok dan Instagram dihitung satu.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {PLATFORMS.map((platform) => (
            <PlatformSummary key={platform} platform={platform} summary={platformData(data, platform)} />
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{frozenAt ? "Saran aktif saat disimpan" : "Saran aktif"}</h3>
          {frozenAt ? (
            data.suggestions.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {data.suggestions.map((line, i) => (
                  <li key={i} className="[overflow-wrap:anywhere]">
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada saran aktif saat itu.</p>
            )
          ) : (
            <SuggestionList suggestions={suggestions ?? []} limit={3} empty="Tidak ada saran aktif." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformSummary({
  platform,
  summary,
}: {
  platform: (typeof PLATFORMS)[number];
  summary: ReviewPlatformData | null;
}) {
  const label = PLATFORM_LABELS[platform];
  return (
    <section aria-label={`Ringkasan ${label}`} className="min-w-0 space-y-3 rounded-lg border p-3">
      <h3>
        <PlatformBadge platform={platform} full />
      </h3>
      {summary === null ? (
        <p className="text-sm text-muted-foreground">Tidak ada data {label} di ringkasan ini.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Post tayang</dt>
              <dd className="text-lg font-semibold">{summary.postCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Followers bertambah</dt>
              <dd className="text-lg font-semibold">{formatSigned(summary.followersGained)}</dd>
              {summary.followersGained !== null ? (
                <dd className="text-xs text-muted-foreground">
                  {formatCount(summary.followersStart)} → {formatCount(summary.followersEnd)}
                </dd>
              ) : (
                <dd className="text-xs text-muted-foreground">Butuh 2 snapshot followers</dd>
              )}
            </div>
          </dl>
          {summary.postCount === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada post {label} minggu ini.</p>
          ) : summary.scoredCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada skor relatif (butuh metrik H+1/H+7 dan minimal 3 post pembanding).
            </p>
          ) : (
            <dl className="grid gap-2 text-sm">
              <PostRef label="Terbaik" post={summary.best} />
              <PostRef label="Terburuk" post={summary.worst} />
            </dl>
          )}
        </>
      )}
    </section>
  );
}

function PostRef({ label, post }: { label: string; post: ReviewPlatformData["best"] }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="w-16 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
        {post ? (
          <>
            <Link href={routes.studio.post(post.id)} className="min-w-0 truncate font-medium hover:underline">
              {post.title}
            </Link>
            <span className="shrink-0 tabular-nums text-muted-foreground" title="Skor relatif">
              {formatRelative(post.relativeScore)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        )}
      </dd>
    </div>
  );
}
