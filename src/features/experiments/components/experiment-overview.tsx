import type { Platform } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import type { DecidingMetric, ExperimentVariable } from "@/lib/analytics/experiments";
import { PLATFORM_LABELS } from "@/lib/labels";
import {
  decidingMetricLabel,
  EXPERIMENT_VARIABLE_LABELS,
  HYPOTHESIS_READING,
  VARIANT_ROLE_LABELS,
} from "../schema";

/** Cara membaca hipotesis: selalu "B lebih baik dari A", diukur dari metrik penentu H+7. */
export function ExperimentOverview({
  platform,
  variable,
  variantA,
  variantB,
  decidingMetric,
}: {
  platform: Platform;
  variable: ExperimentVariable;
  variantA: string;
  variantB: string;
  decidingMetric: DecidingMetric;
}) {
  const metricLabel = decidingMetricLabel(decidingMetric, platform);
  const rows = [
    { label: `Varian A (${VARIANT_ROLE_LABELS.A})`, value: variantA },
    { label: `Varian B (${VARIANT_ROLE_LABELS.B})`, value: variantB },
    { label: "Variabel", value: EXPERIMENT_VARIABLE_LABELS[variable] },
    { label: "Metrik penentu", value: `${metricLabel} H+7 (${PLATFORM_LABELS[platform]})` },
  ];

  return (
    <Card size="sm">
      <CardContent className="grid gap-3">
        <p className="text-sm [overflow-wrap:anywhere]">
          <span className="text-muted-foreground">Dibaca &quot;{HYPOTHESIS_READING}&quot;:</span>{" "}
          <span className="font-medium">B</span> ({variantB}) menghasilkan {metricLabel} lebih tinggi daripada{" "}
          <span className="font-medium">A</span> ({variantA}).
        </p>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm [overflow-wrap:anywhere]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
