import Link from "next/link";
import { CalendarDays, Clapperboard, Frame, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MEDIUM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { formatProjectDates } from "../format";
import type { ProjectListItem } from "../queries";
import { ProgressPhotoImage } from "./progress-photo-image";
import { ProjectStageBadge } from "./project-stage-badge";

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const dates = formatProjectDates(project.startDate, project.endDate);

  return (
    <Link
      href={routes.studio.project(project.id)}
      className="group flex h-full gap-1 rounded-card bg-card p-2 text-card-foreground ring-1 ring-border/70 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden sm:flex-col"
    >
      <div className="relative min-h-28 w-28 shrink-0 overflow-hidden rounded-card-nested bg-muted sm:aspect-[4/3] sm:min-h-0 sm:w-full">
        {project.latestPhoto ? (
          <ProgressPhotoImage
            photo={project.latestPhoto}
            alt={project.latestPhoto.caption ?? `Foto progres ${project.title}`}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 112px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5 sm:px-3 sm:pb-3">
        <p className="line-clamp-2 font-heading text-h6">{project.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProjectStageBadge stage={project.stage} />
          <Badge variant="outline">{MEDIUM_LABELS[project.medium]}</Badge>
        </div>
        <div className="mt-auto grid gap-1 text-xs text-muted-foreground">
          {dates && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              {dates}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clapperboard className="size-3.5 shrink-0" />
            {project.contentCount === 0
              ? "Belum ada konten"
              : `${project.contentCount} konten · ${project.postedCount} Posted`}
          </span>
          {project.artworkCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Frame className="size-3.5 shrink-0" />
              {project.artworkCount} karya
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
