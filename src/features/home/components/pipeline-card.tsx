import Link from "next/link";
import { FolderKanban } from "lucide-react";
import type { ContentStage } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTENT_STAGE_LABELS, CONTENT_STAGES } from "@/lib/labels";
import { routes } from "@/lib/routes";

/** Jumlah konten per stage: kartu bento gelap, setiap stage satu ubin tembus pandang. */
export function PipelineCard({
  stageCounts,
  className,
}: {
  stageCounts: Record<ContentStage, number>;
  className?: string;
}) {
  return (
    <Card variant="dark" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="size-4" aria-hidden />
          Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @xl:grid-cols-2">
          {CONTENT_STAGES.map((stage) => (
            <li key={stage}>
              <Link
                href={routes.studio.pipeline}
                className="block rounded-card-nested bg-current/10 px-3.5 py-3 transition-colors outline-hidden hover:bg-current/15 focus-visible:ring-3 focus-visible:ring-bento-dark-foreground/50"
              >
                <span className="block font-heading text-h4">{stageCounts[stage]}</span>
                <span className="text-caption">{CONTENT_STAGE_LABELS[stage]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
