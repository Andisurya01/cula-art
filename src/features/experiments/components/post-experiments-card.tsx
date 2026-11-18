import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import type { PostExperiment } from "../queries";
import { VARIANT_ROLE_LABELS } from "../schema";
import { ExperimentResultBadge } from "./experiment-result-badge";

/**
 * Kartu "Eksperimen" di detail post: eksperimen yang memakai post ini (hipotesis, varian, status) + tautan.
 * Data dari `getExperimentsForPost(postId)`. Tanpa eksperimen → tidak merender apa pun.
 */
export function PostExperimentsCard({ experiments }: { experiments: readonly PostExperiment[] }) {
  if (experiments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="size-4 text-muted-foreground" aria-hidden />
          Eksperimen
        </CardTitle>
        <CardDescription>Post ini dipakai di {experiments.length} eksperimen.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {experiments.map((experiment) => (
            <li key={experiment.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link href={routes.studio.experiment(experiment.id)} className="group flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium [overflow-wrap:anywhere] group-hover:underline">
                    {experiment.hypothesis}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <ExperimentResultBadge result={experiment.result} />
                    <span className="[overflow-wrap:anywhere]">
                      Varian {experiment.variant} ({VARIANT_ROLE_LABELS[experiment.variant]}):{" "}
                      {experiment.variantDescription}
                    </span>
                  </div>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
