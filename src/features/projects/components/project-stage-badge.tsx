import type { ProjectStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STAGE_LABELS } from "@/lib/labels";

/** Warna status dari token: dikerjakan = pil primer, selesai = sukses, jeda = peringatan. */
const VARIANT: Record<ProjectStage, "default" | "secondary" | "success" | "warning"> = {
  PLANNING: "secondary",
  IN_PROGRESS: "default",
  DONE: "success",
  PAUSED: "warning",
};

export function ProjectStageBadge({ stage }: { stage: ProjectStage }) {
  return <Badge variant={VARIANT[stage]}>{PROJECT_STAGE_LABELS[stage]}</Badge>;
}
