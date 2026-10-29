import type { Metadata } from "next";
import { Layers, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { StageFilter } from "@/features/projects/components/stage-filter";
import { getProjects } from "@/features/projects/queries";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Proyek & Seri" };

type ProjectStageParam = (typeof PROJECT_STAGES)[number];

function parseStage(value: string | string[] | undefined): ProjectStageParam | undefined {
  return PROJECT_STAGES.find((s) => s === value);
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const stage = parseStage((await searchParams).tahap);
  const projects = await getProjects({ stage });

  const newProjectButton = (
    <Button size="sm">
      <Plus />
      Proyek baru
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Proyek & Seri"
        description="Karya panjang (gambar/clay) yang dipecah menjadi beberapa post berseri."
        actions={<ProjectFormDialog trigger={newProjectButton} />}
      />

      <StageFilter active={stage} />

      {projects.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={stage ? `Tidak ada proyek "${PROJECT_STAGE_LABELS[stage]}"` : "Belum ada proyek"}
          description={
            stage
              ? "Coba filter tahap lain."
              : "Buat proyek untuk satu karya, lalu pakai Buat Seri untuk memecahnya jadi Part 1, 2, 3… di Pipeline."
          }
          action={stage ? undefined : <ProjectFormDialog trigger={newProjectButton} />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
