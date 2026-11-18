import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { ExperimentCard } from "@/features/experiments/components/experiment-card";
import { ExperimentFormDialog } from "@/features/experiments/components/experiment-form-dialog";
import { ExperimentStatusFilter } from "@/features/experiments/components/experiment-status-filter";
import { getExperiments, type ExperimentListItem } from "@/features/experiments/queries";
import {
  EXPERIMENT_STATUS_FILTER_LABELS,
  parseExperimentStatusFilter,
} from "@/features/experiments/schema";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Eksperimen" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filter = parseExperimentStatusFilter((await searchParams).status);
  const { running, finished } = await getExperiments(new Date(), filter);
  const total = running.length + finished.length;

  const newButton = (
    <Button size="sm">
      <Plus />
      Eksperimen baru
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Eksperimen"
        description="Uji satu hal (hook, format, jam, durasi, cover) dengan post varian A vs B di satu platform."
        actions={<ExperimentFormDialog trigger={newButton} />}
      />

      <ExperimentStatusFilter active={filter} />

      {total === 0 ? (
        filter ? (
          <EmptyState
            icon={FlaskConical}
            title={`Tidak ada eksperimen ${EXPERIMENT_STATUS_FILTER_LABELS[filter].toLowerCase()}`}
            action={
              <Button asChild variant="outline">
                <Link href={routes.studio.experiments}>Lihat semua eksperimen</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FlaskConical}
            title="Belum ada eksperimen"
            description={
              <ol className="grid list-decimal gap-1 pl-5 text-left">
                <li>Tulis hipotesis, pilih platform, variabel, dan metrik penentu. Hipotesis dibaca &quot;B lebih baik dari A&quot;.</li>
                <li>Hubungkan post yang sudah tayang ke varian A (pembanding) dan B (yang diuji), minimal 2 post per varian.</li>
                <li>Setelah semua post punya metrik H+7, lihat perbandingan dan simpan kesimpulan.</li>
              </ol>
            }
            action={<ExperimentFormDialog trigger={newButton} />}
          />
        )
      ) : (
        <div className="grid gap-6">
          {filter !== "selesai" && (
            <ExperimentSection
              title="Berjalan"
              items={running}
              empty="Tidak ada eksperimen yang berjalan. Buat eksperimen baru untuk menguji ide berikutnya."
            />
          )}
          {filter !== "berjalan" && (
            <ExperimentSection title="Selesai" items={finished} empty="Belum ada eksperimen yang disimpulkan." />
          )}
        </div>
      )}
    </>
  );
}

function ExperimentSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: readonly ExperimentListItem[];
  empty: string;
}) {
  return (
    <section aria-label={title} className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((experiment) => (
            <li key={experiment.id}>
              <ExperimentCard experiment={experiment} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
