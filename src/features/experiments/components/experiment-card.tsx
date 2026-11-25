import Link from "next/link";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { formatWib } from "@/lib/date";
import { routes } from "@/lib/routes";
import { comparisonStatusText } from "../copy";
import type { ExperimentListItem } from "../queries";
import { decidingMetricLabel, EXPERIMENT_VARIABLE_LABELS } from "../schema";
import { ExperimentResultBadge } from "./experiment-result-badge";

/** Kartu satu eksperimen di daftar (satu kolom di HP). */
export function ExperimentCard({ experiment }: { experiment: ExperimentListItem }) {
  const running = experiment.result === null;
  const date = running ? experiment.createdAt : (experiment.concludedAt ?? experiment.createdAt);

  return (
    <Link
      href={routes.studio.experiment(experiment.id)}
      className="flex h-full flex-col gap-2.5 rounded-card bg-card p-5 text-sm ring-1 ring-border/70 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <PlatformBadge platform={experiment.platform} />
        <ExperimentResultBadge result={experiment.result} />
        <span className="text-xs text-muted-foreground">
          {EXPERIMENT_VARIABLE_LABELS[experiment.variable]} ·{" "}
          {decidingMetricLabel(experiment.decidingMetric, experiment.platform)}
        </span>
      </div>
      <p className="font-heading text-h6 [overflow-wrap:anywhere]">{experiment.hypothesis}</p>
      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
        <span className="font-medium text-foreground">B</span> {experiment.variantB} vs{" "}
        <span className="font-medium text-foreground">A</span> {experiment.variantA}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>
          A: {experiment.counts.A} post · B: {experiment.counts.B} post
          {running && ` · ${comparisonStatusText(experiment.comparison)}`}
        </span>
        <span>
          {running ? "Dibuat" : "Disimpulkan"} {formatWib(date, "d MMM yyyy")}
        </span>
      </div>
    </Link>
  );
}
