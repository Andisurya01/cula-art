import type { ArtworkVisibility } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ARTWORK_VISIBILITY_LABELS } from "@/lib/labels";

const VARIANT: Record<ArtworkVisibility, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

export function VisibilityBadge({ visibility }: { visibility: ArtworkVisibility }) {
  return <Badge variant={VARIANT[visibility]}>{ARTWORK_VISIBILITY_LABELS[visibility]}</Badge>;
}
