import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysSince } from "@/lib/date";
import { CONTENT_STAGE_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { HomeOverview } from "../queries";

/** Konten yang tertahan lebih dari 7 hari di kolom yang sama. */
export function StaleContentsCard({
  contents,
  now,
}: {
  contents: HomeOverview["staleContents"];
  now: Date;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Konten macet</CardTitle>
      </CardHeader>
      <CardContent>
        {contents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada konten yang tertahan lebih dari 7 hari di kolom yang sama.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {contents.map((content) => (
              <li key={content.id}>
                <Link
                  href={routes.studio.content(content.id)}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{content.title}</span>
                    <PillarBadge
                      name={content.pillar.name}
                      color={content.pillar.color}
                      className="text-muted-foreground"
                    />
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {CONTENT_STAGE_LABELS[content.stage]} · {daysSince(content.stageChangedAt, now)} hari
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
