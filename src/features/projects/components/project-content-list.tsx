import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STAGE_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { ProjectDetail } from "../queries";

type ProjectContent = ProjectDetail["contents"][number];

/** Konten proyek urut nomor part; klik membuka detail konten. */
export function ProjectContentList({ contents }: { contents: ProjectContent[] }) {
  return (
    <ul className="grid gap-1 rounded-card bg-card p-2 text-card-foreground ring-1 ring-border/70">
      {contents.map((content) => (
        <li key={content.id}>
          <Link
            href={routes.studio.content(content.id)}
            className="flex items-center gap-3 rounded-card-nested px-3 py-2.5 transition-colors outline-hidden hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {content.seriesPart != null ? (
                <>
                  <span className="type-label leading-none">Part</span>
                  <span className="mt-0.5 text-sm leading-none font-semibold text-foreground tabular-nums">
                    {content.seriesPart}
                  </span>
                </>
              ) : (
                <span>–</span>
              )}
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="truncate text-sm font-medium">{content.title}</span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                <PillarBadge name={content.pillar.name} color={content.pillar.color} />
                {content.format && <span className="text-xs">{content.format.name}</span>}
              </span>
            </span>
            <Badge variant={content.stage === "POSTED" ? "default" : "outline"}>
              {CONTENT_STAGE_LABELS[content.stage]}
            </Badge>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
