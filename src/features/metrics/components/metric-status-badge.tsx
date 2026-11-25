import { CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MetricKind, MetricStatus } from "@/lib/analytics/snapshots";
import { METRIC_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type BadgeVariant = "outline" | "warning" | "success";

/** Menunggu = garis tipis, perlu diisi = peringatan, lengkap = sukses (warna dari token tema). */
const VARIANT: Record<MetricStatus, BadgeVariant> = {
  WAITING_H1: "outline",
  WAITING_H7: "outline",
  NEED_H1: "warning",
  NEED_H7: "warning",
  COMPLETE: "success",
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
  const variant = VARIANT[status];
  return (
    <Badge variant={variant} className={cn(variant === "outline" && "text-muted-foreground", className)}>
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
      className={cn(
        "inline-flex items-center rounded-badge border px-1.5 py-0.5 font-sans type-label text-muted-foreground",
        className,
      )}
    >
      H+1
    </span>
  );
}
