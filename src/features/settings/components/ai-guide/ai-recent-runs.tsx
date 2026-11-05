"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatWib } from "@/lib/date";
import type { AiRunStatusValue } from "@/lib/analytics/ai-usage";
import { formatUsd } from "@/features/ai/format";
import type { AiSettingsPageData } from "@/features/ai/queries";
import { AI_RUN_STATUS_LABELS, aiRunFeatureLabel, aiRunModelLabel } from "../../ai-guide";

type RunRow = AiSettingsPageData["recentRuns"][number];

const STATUS_VARIANTS: Record<AiRunStatusValue, "secondary" | "destructive" | "outline"> = {
  OK: "secondary",
  ERROR: "destructive",
  REFUSED: "outline",
  RUNNING: "outline",
};

function formatTime(date: Date): string {
  return `${formatWib(date, "d MMM yyyy, HH:mm")} WIB`;
}

/** "Ya"/"Tidak" hanya bermakna untuk run OK (hanya run OK yang bisa dipakai). */
function acceptedLabel(run: RunRow): string | null {
  if (run.status !== "OK") return null;
  return run.accepted ? "Dipakai" : "Tidak dipakai";
}

/** 20 panggilan terakhir: daftar kartu di HP, tabel mulai 768 px. Dilipat supaya tab tetap ringkas. */
export function AiRecentRuns({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada panggilan AI.</p>;
  }

  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {runs.length} panggilan terakhir
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <ul className="divide-y border-t md:hidden">
        {runs.map((run) => (
          <li key={run.id} className="grid gap-1 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <FeatureName run={run} />
              <StatusBadge status={run.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {[aiRunModelLabel(run.model), formatUsd(run.costUsd), acceptedLabel(run)].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">{formatTime(run.createdAt)}</p>
            <ErrorMessage message={run.errorMessage} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto border-t md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-3 py-2 font-medium">Waktu</th>
              <th scope="col" className="px-3 py-2 font-medium">Fitur</th>
              <th scope="col" className="px-3 py-2 font-medium">Model</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Biaya</th>
              <th scope="col" className="px-3 py-2 font-medium">Dipakai</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.map((run) => (
              <tr key={run.id} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatTime(run.createdAt)}
                </td>
                <td className="px-3 py-2">
                  <FeatureName run={run} />
                  <ErrorMessage message={run.errorMessage} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{aiRunModelLabel(run.model)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatUsd(run.costUsd)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.status === "OK" ? (run.accepted ? "Ya" : "Tidak") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function FeatureName({ run }: { run: RunRow }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-medium">
      <span className="truncate">{aiRunFeatureLabel(run.feature)}</span>
      {run.targetType === "EVAL" && <Badge variant="outline">Set uji</Badge>}
    </span>
  );
}

function StatusBadge({ status }: { status: AiRunStatusValue }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{AI_RUN_STATUS_LABELS[status]}</Badge>;
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="line-clamp-2 text-xs text-destructive" title={message}>
      {message}
    </p>
  );
}
