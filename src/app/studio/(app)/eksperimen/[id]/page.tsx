import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { ComparisonCard } from "@/features/experiments/components/comparison-card";
import { ConclusionCard } from "@/features/experiments/components/conclusion-card";
import { DeleteExperimentButton } from "@/features/experiments/components/delete-experiment-button";
import { ExperimentFormDialog } from "@/features/experiments/components/experiment-form-dialog";
import { ExperimentOverview } from "@/features/experiments/components/experiment-overview";
import { ExperimentResultBadge } from "@/features/experiments/components/experiment-result-badge";
import { VariantPostsCard } from "@/features/experiments/components/variant-posts-card";
import { getExperiment, getExperimentHypothesis } from "@/features/experiments/queries";
import { EXPERIMENT_VARIANTS } from "@/features/experiments/schema";
import { formatWib } from "@/lib/date";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

const TITLE_MAX = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const hypothesis = await getExperimentHypothesis(id);
  if (!hypothesis) return { title: "Eksperimen tidak ditemukan" };
  const short = hypothesis.length > TITLE_MAX ? `${hypothesis.slice(0, TITLE_MAX - 1).trimEnd()}…` : hypothesis;
  return { title: `Eksperimen: ${short}` };
}

export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getExperiment(id, new Date());
  if (!detail) notFound();

  const { experiment, posts, comparison, excludedCount, candidates, counts } = detail;
  const locked = experiment.result !== null;
  const postCount = counts.A + counts.B;
  const descriptions = { A: experiment.variantA, B: experiment.variantB };

  return (
    <div className="grid gap-4">
      <Link
        href={routes.studio.experiments}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Eksperimen
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere] md:text-2xl">
            {experiment.hypothesis}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <PlatformBadge platform={experiment.platform} full />
            <ExperimentResultBadge result={experiment.result} />
            <span>Dibuat {formatWib(experiment.createdAt, "d MMM yyyy")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExperimentFormDialog
            experiment={experiment}
            postCount={postCount}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil />
                Ubah
              </Button>
            }
          />
          <DeleteExperimentButton
            experimentId={experiment.id}
            hypothesis={experiment.hypothesis}
            postCount={postCount}
          />
        </div>
      </div>

      <ExperimentOverview
        platform={experiment.platform}
        variable={experiment.variable}
        variantA={experiment.variantA}
        variantB={experiment.variantB}
        decidingMetric={experiment.decidingMetric}
      />

      <div className="grid items-start gap-4 md:grid-cols-2">
        {EXPERIMENT_VARIANTS.map((variant) => (
          <VariantPostsCard
            key={variant}
            experimentId={experiment.id}
            variant={variant}
            description={descriptions[variant]}
            platform={experiment.platform}
            metric={experiment.decidingMetric}
            posts={posts.filter((p) => p.variant === variant)}
            candidates={candidates}
            locked={locked}
          />
        ))}
      </div>

      <ComparisonCard
        comparison={comparison}
        metric={experiment.decidingMetric}
        platform={experiment.platform}
        posts={posts}
        excludedCount={excludedCount}
      />

      <ConclusionCard
        experimentId={experiment.id}
        result={experiment.result}
        notes={experiment.notes}
        concludedAt={experiment.concludedAt}
        proposal={comparison.status === "READY" ? comparison.proposal : null}
      />
    </div>
  );
}
