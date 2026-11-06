import Link from "next/link";
import type { ContentStage } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTENT_STAGE_LABELS, CONTENT_STAGES } from "@/lib/labels";
import { routes } from "@/lib/routes";

/** Jumlah konten per stage. */
export function PipelineCard({ stageCounts }: { stageCounts: Record<ContentStage, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CONTENT_STAGES.map((stage) => (
            <li key={stage}>
              <Link href={routes.studio.pipeline} className="block rounded-lg border px-3 py-2 hover:bg-muted/50">
                <span className="block text-2xl font-semibold">{stageCounts[stage]}</span>
                <span className="text-xs text-muted-foreground">{CONTENT_STAGE_LABELS[stage]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
