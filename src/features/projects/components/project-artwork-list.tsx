import Image from "next/image";
import Link from "next/link";
import type { ArtworkVisibility } from "@prisma/client";
import { ChevronRight, Frame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ARTWORK_VISIBILITY_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { ProjectArtworkItem } from "../queries";

const VISIBILITY_VARIANT: Record<ArtworkVisibility, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

/** Karya yang berasal dari proyek; klik membuka form karya di Studio. */
export function ProjectArtworkList({ artworks }: { artworks: ProjectArtworkItem[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {artworks.map((artwork) => (
        <li key={artwork.id}>
          <Link
            href={routes.studio.artwork(artwork.id)}
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
              {artwork.cover ? (
                <Image
                  src={routes.media(artwork.cover.storageKey)}
                  alt={artwork.cover.alt || artwork.title}
                  width={artwork.cover.width}
                  height={artwork.cover.height}
                  sizes="44px"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <Frame className="absolute inset-0 m-auto size-4 text-muted-foreground" />
              )}
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="truncate text-sm font-medium">{artwork.title}</span>
              {artwork.year != null && (
                <span className="text-xs text-muted-foreground">{artwork.year}</span>
              )}
            </span>
            <Badge variant={VISIBILITY_VARIANT[artwork.visibility]}>
              {ARTWORK_VISIBILITY_LABELS[artwork.visibility]}
            </Badge>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
