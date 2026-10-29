import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PillarBadge } from "@/components/pillar-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/features/auth/dal";
import { getHomeOverview } from "@/features/home/queries";
import { daysSince, formatWib } from "@/lib/date";
import {
  CONTENT_STAGE_LABELS,
  CONTENT_STAGES,
  IDEA_BANK_LOW_THRESHOLD,
  PLATFORM_LABELS,
} from "@/lib/labels";
import { routes } from "@/lib/routes";

// Template "%s · Studio" dari layout tidak berlaku untuk page di segmen yang sama.
export const metadata: Metadata = { title: { absolute: "Beranda · Studio" } };

export default async function BerandaPage() {
  await requireAdmin();
  const data = await getHomeOverview();
  const scheduledCount = data.weekItems.length;
  const remaining = Math.max(data.target - scheduledCount, 0);
  const progress = data.target > 0 ? Math.min(scheduledCount / data.target, 1) : 0;

  return (
    <>
      <PageHeader
        title="Beranda"
        description={`Minggu ${formatWib(data.weekStart, "d MMMM yyyy")} · apa yang perlu dikerjakan`}
      />

      {data.newIdeaCount < IDEA_BANK_LOW_THRESHOLD && (
        <Alert className="mb-4">
          <Lightbulb />
          <AlertTitle>Bank ide menipis</AlertTitle>
          <AlertDescription>
            Tinggal {data.newIdeaCount} ide berstatus Baru. Catat beberapa ide lagi supaya pipeline
            tidak kosong.{" "}
            <Link href={routes.studio.ideas} className="font-medium underline underline-offset-4">
              Buka Bank Ide
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Post minggu ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums">
              {scheduledCount}
              <span className="text-base font-normal text-muted-foreground"> dari {data.target} post</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">
              {data.postedThisWeek} sudah tayang ·{" "}
              {remaining > 0 ? `kurang ${remaining} slot terjadwal` : "target terjadwal terpenuhi"}
            </p>
            {data.weekItems.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {data.weekItems.map((item) => (
                  <li key={item.contentId}>
                    <Link
                      href={routes.studio.content(item.contentId)}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      {item.posted ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <PillarBadge name={item.pillar.name} color={item.pillar.color} />
                          {item.platforms.map((p) => PLATFORM_LABELS[p]).join(" + ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatWib(item.at, "EEE HH.mm")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={routes.studio.calendar}>Jadwalkan di Kalender</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CONTENT_STAGES.map((stage) => (
                <li key={stage}>
                  <Link
                    href={routes.studio.pipeline}
                    className="block rounded-lg border px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="block text-2xl font-semibold tabular-nums">
                      {data.stageCounts[stage]}
                    </span>
                    <span className="text-xs text-muted-foreground">{CONTENT_STAGE_LABELS[stage]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Konten macet</CardTitle>
          </CardHeader>
          <CardContent>
            {data.staleContents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada konten yang tertahan lebih dari 7 hari di kolom yang sama.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.staleContents.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={routes.studio.content(c.id)}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.title}</span>
                        <PillarBadge name={c.pillar.name} color={c.pillar.color} className="text-muted-foreground" />
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {CONTENT_STAGE_LABELS[c.stage]} · {daysSince(c.stageChangedAt)} hari
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Metrik tertunda, saran otomatis, dan grafik followers hadir di Fase 4 dan 5.
      </p>
    </>
  );
}
