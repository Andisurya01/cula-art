import type { ProjectStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STAGE_LABELS } from "@/lib/labels";

const VARIANT: Record<ProjectStage, "default" | "secondary" | "outline"> = {
  PLANNING: "secondary",
  IN_PROGRESS: "default",
  DONE: "outline",
  PAUSED: "outline",
};

export function ProjectStageBadge({ stage }: { stage: ProjectStage }) {
  return <Badge variant={VARIANT[stage]}>{PROJECT_STAGE_LABELS[stage]}</Badge>;
}
