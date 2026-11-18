import { CircleCheck, CircleQuestionMark, CircleX, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExperimentResultValue } from "@/lib/analytics/experiments";
import { cn } from "@/lib/utils";
import { EXPERIMENT_RESULT_LABELS } from "../schema";

const STYLE: Record<ExperimentResultValue, string> = {
  SUPPORTED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
  INCONCLUSIVE: "bg-muted text-foreground",
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
    <Badge variant="outline" className={cn("border-transparent", STYLE[result], className)}>
      <Icon />
      {EXPERIMENT_RESULT_LABELS[result]}
    </Badge>
  );
}
