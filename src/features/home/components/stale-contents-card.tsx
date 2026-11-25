import Link from "next/link";
import { AlertTriangle, Hourglass } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysSince } from "@/lib/date";
import { CONTENT_STAGE_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { HomeOverview } from "../queries";
import { ROW_LINK, ROW_LIST } from "./row-styles";

/** Konten yang tertahan lebih dari 7 hari di kolom yang sama. */
export function StaleContentsCard({
  contents,
  now,
  className,
}: {
  contents: HomeOverview["staleContents"];
  now: Date;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="size-4 text-muted-foreground" aria-hidden />
          Konten macet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada konten yang tertahan lebih dari 7 hari di kolom yang sama.
          </p>
        ) : (
          <ul className={cn(ROW_LIST, "@4xl:grid-cols-2")}>
            {contents.map((content) => (
              <li key={content.id}>
                <Link href={routes.studio.content(content.id)} className={cn("flex items-center gap-3", ROW_LINK)}>
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{content.title}</span>
                    <PillarBadge
                      name={content.pillar.name}
                      color={content.pillar.color}
                      className="max-w-full text-muted-foreground"
                    />
                  </span>
                  <Badge variant="outline" className="shrink-0 bg-card">
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
