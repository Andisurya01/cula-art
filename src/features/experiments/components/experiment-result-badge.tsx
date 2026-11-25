import { CircleCheck, CircleQuestionMark, CircleX, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExperimentResultValue } from "@/lib/analytics/experiments";
import { cn } from "@/lib/utils";
import { EXPERIMENT_RESULT_LABELS } from "../schema";

/** Didukung = sukses, ditolak = destruktif, belum bisa disimpulkan = abu (warna dari token tema). */
const VARIANT: Record<ExperimentResultValue, "success" | "destructive" | "secondary"> = {
  SUPPORTED: "success",
  REJECTED: "destructive",
  INCONCLUSIVE: "secondary",
};

const ICON: Record<ExperimentResultValue, typeof CircleCheck> = {
  SUPPORTED: CircleCheck,
  REJECTED: CircleX,
  INCONCLUSIVE: CircleQuestionMark,
};

/** Hasil eksperimen (warna selalu ditemani ikon dan label). `null` = masih berjalan. */
export function ExperimentResultBadge({
  result,
  className,
}: {
  result: ExperimentResultValue | null;
  className?: string;
}) {
  if (result === null) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <FlaskConical />
        Berjalan
      </Badge>
    );
  }
  const Icon = ICON[result];
  return (
    <Badge variant={VARIANT[result]} className={className}>
      <Icon />
      {EXPERIMENT_RESULT_LABELS[result]}
    </Badge>
  );
}
