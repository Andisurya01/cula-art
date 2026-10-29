import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clapperboard, Frame, ImageIcon, Pencil } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { AddPhotoDialog } from "@/features/projects/components/add-photo-dialog";
import { CreateArtworkDialog } from "@/features/projects/components/create-artwork-dialog";
import { CreateSeriesDialog } from "@/features/projects/components/create-series-dialog";
import { DeleteProjectButton } from "@/features/projects/components/delete-project-button";
import { PhotoGallery } from "@/features/projects/components/photo-gallery";
import { ProjectArtworkList } from "@/features/projects/components/project-artwork-list";
import { ProjectContentList } from "@/features/projects/components/project-content-list";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { ProjectStageBadge } from "@/features/projects/components/project-stage-badge";
import { formatProjectDates } from "@/features/projects/format";
import { getProject, getProjectArtworks } from "@/features/projects/queries";
import { nextSeriesPart } from "@/features/projects/series";
import { getTaxonomies } from "@/features/settings/queries";
import { MEDIUM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const project = await getProject((await params).id);
  return { title: project ? project.title : "Proyek tidak ditemukan" };
}

export default async function ProjectDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [project, taxonomies, artworks] = await Promise.all([
    getProject(id),
    getTaxonomies(),
    getProjectArtworks(id),
  ]);
  if (!project) notFound();

  const dates = formatProjectDates(project.startDate, project.endDate);
  const postedCount = project.contents.filter((c) => c.stage === "POSTED").length;
  const nextPart = nextSeriesPart(project.contents.map((c) => c.seriesPart));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
        <Link href={routes.studio.projects}>
          <ChevronLeft />
          Semua proyek
        </Link>
      </Button>

      <PageHeader
        title={project.title}
        actions={
          <>
            <CreateArtworkDialog
              projectId={project.id}
              photos={project.photos}
              artworkCount={artworks.length}
            />
            <ProjectFormDialog
              project={{
                id: project.id,
                title: project.title,
                medium: project.medium,
                stage: project.stage,
                startDate: project.startDate,
                endDate: project.endDate,
                notes: project.notes,
              }}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil />
                  Ubah
                </Button>
              }
            />
            <DeleteProjectButton
              projectId={project.id}
              title={project.title}
              contentCount={project.contents.length}
              photoCount={project.photos.length}
              artworkCount={artworks.length}
            />
          </>
        }
      />

      <section className="mb-8 grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <ProjectStageBadge stage={project.stage} />
          <Badge variant="outline">{MEDIUM_LABELS[project.medium]}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" />
            {dates ?? "Tanggal belum diisi"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clapperboard className="size-4 shrink-0" />
            {project.contents.length} konten · {postedCount} Posted
          </span>
        </div>
        {project.notes && <p className="text-sm whitespace-pre-line">{project.notes}</p>}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Karya dari proyek ini</h2>
        {artworks.length > 0 ? (
          <ProjectArtworkList artworks={artworks} />
        ) : (
          <p className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
            <Frame className="mt-0.5 size-4 shrink-0" />
            Belum ada karya. Saat proyek selesai, pakai Jadikan Karya untuk membuat karya Draft yang
            bisa diterbitkan ke Galeri.
          </p>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Konten seri</h2>
          <CreateSeriesDialog
            projectId={project.id}
            projectTitle={project.title}
            nextPart={nextPart}
            pillars={taxonomies.pillars.map(({ id, name, color }) => ({ id, name, color }))}
            formats={taxonomies.formats.map(({ id, name }) => ({ id, name }))}
          />
        </div>
        {project.contents.length > 0 ? (
          <ProjectContentList contents={project.contents} />
        ) : (
          <EmptyState
            icon={Clapperboard}
            title="Belum ada konten"
            description="Pakai Buat Seri untuk membuat Part 1..N sekaligus di Pipeline."
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Foto progres</h2>
          <AddPhotoDialog projectId={project.id} />
        </div>
        {project.photos.length > 0 ? (
          <PhotoGallery photos={project.photos} />
        ) : (
          <EmptyState
            icon={ImageIcon}
            title="Belum ada foto progres"
            description="Unggah foto tiap tahap (armature, bentuk dasar, detail…) atau tempel tautan URL."
          />
        )}
      </section>
    </>
  );
}
