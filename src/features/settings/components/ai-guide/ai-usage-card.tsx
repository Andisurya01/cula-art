"use client";

import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiUsageSummary } from "@/lib/analytics/ai-usage";
import { formatUsd } from "@/features/ai/format";
import type { AiSettingsPageData } from "@/features/ai/queries";
import { budgetLevel, formatPercent } from "../../ai-guide";
import { AiRecentRuns } from "./ai-recent-runs";

const BAR_COLORS = {
  normal: "bg-primary",
  warning: "bg-amber-500",
  over: "bg-destructive",
} as const;

/** Ringkasan pemakaian bulan ini (angka dari lib/analytics/ai-usage) + 20 panggilan terakhir. */
export function AiUsageCard({
  usage,
  monthlyBudgetUsd,
  recentRuns,
}: {
  usage: AiUsageSummary;
  monthlyBudgetUsd: number;
  recentRuns: AiSettingsPageData["recentRuns"];
}) {
  const level = budgetLevel(usage.budgetUsedPercent);
  const barWidth = Math.min(100, Math.max(0, usage.budgetUsedPercent));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pemakaian bulan ini</CardTitle>
        <CardDescription>
          Sejak tanggal 1 (WIB). “Ditolak” berarti ditolak pengaman model; permintaan yang tertahan batas
          tidak dihitung.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Panggilan"
            value={usage.calls.toLocaleString("id-ID")}
            detail={`${usage.okCalls} OK · ${usage.failedCalls} gagal · ${usage.refusedCalls} ditolak${
              usage.runningCalls ? ` · ${usage.runningCalls} berjalan` : ""
            }`}
          />
          <Stat label="Token" value={usage.totalTokens.toLocaleString("id-ID")} detail="Input, output, dan cache" />
          <Stat label="Biaya" value={formatUsd(usage.costUsd)} detail={`Batas ${formatUsd(monthlyBudgetUsd)}`} />
          <Stat
            label="Draf dipakai"
            value={formatPercent(usage.acceptedPercent)}
            detail={`${usage.acceptedCalls} dari ${usage.okCalls} panggilan OK`}
          />
        </dl>

        <div className="grid gap-1.5">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Biaya bulan ini dibanding batas bulanan"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(barWidth)}
            aria-valuetext={`${formatUsd(usage.costUsd)} dari ${formatUsd(monthlyBudgetUsd)}`}
          >
            <div className={cn("h-full rounded-full transition-all", BAR_COLORS[level])} style={{ width: `${barWidth}%` }} />
          </div>
          <p
            className={cn(
              "text-xs",
              level === "over"
                ? "text-destructive"
                : level === "warning"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {formatPercent(usage.budgetUsedPercent)} dari batas bulanan terpakai
            {level === "over" && ". Permintaan baru ditolak sampai bulan depan atau batas dinaikkan."}
          </p>
        </div>

        <AiRecentRuns runs={recentRuns} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{detail}</dd>
    </div>
  );
}
