import { CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MetricKind, MetricStatus } from "@/lib/analytics/snapshots";
import { METRIC_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STYLE: Record<MetricStatus, string> = {
  WAITING_H1: "border-border bg-transparent text-muted-foreground",
  WAITING_H7: "border-border bg-transparent text-muted-foreground",
  NEED_H1: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  NEED_H7: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  COMPLETE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
};

const ICON: Record<MetricStatus, typeof Clock> = {
  WAITING_H1: Clock,
  WAITING_H7: Clock,
  NEED_H1: CircleAlert,
  NEED_H7: CircleAlert,
  COMPLETE: CheckCircle2,
};

/** Badge status metrik: warna selalu ditemani ikon dan label. */
export function MetricStatusBadge({ status, className }: { status: MetricStatus; className?: string }) {
  const Icon = ICON[status];
  return (
    <Badge variant="outline" className={cn(STYLE[status], className)}>
      <Icon />
      {METRIC_STATUS_LABELS[status]}
    </Badge>
  );
}

/** D5: penanda bahwa angka berasal dari cadangan H+1, bukan H+7. H+7 tidak diberi penanda. */
export function SnapshotKindMark({ kind, className }: { kind: MetricKind; className?: string }) {
  if (kind !== "H1") return null;
  return (
    <span
      title="Angka dari snapshot H+1, karena H+7 belum diisi"
      className={cn("rounded border px-1 text-[10px] leading-4 font-medium text-muted-foreground", className)}
    >
      H+1
    </span>
  );
}
