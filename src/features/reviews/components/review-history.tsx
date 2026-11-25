import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "@/features/metrics/format";
import { focusExcerpt } from "../draft";
import type { ReviewHistoryItem } from "../queries";
import { weekRangeLabel } from "../week";

/** Riwayat review tersimpan (terbaru dulu): minggu, post vs target dari ringkasan beku, potongan fokus. */
export function ReviewHistory({ items, currentKey }: { items: readonly ReviewHistoryItem[]; currentKey: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat review</CardTitle>
        <CardDescription>
          {items.length === 0 ? "Belum ada review tersimpan." : `${items.length} review tersimpan, terbaru dulu.`}
        </CardDescription>
      </CardHeader>
      {items.length > 0 && (
        <CardContent>
          <ul className="divide-y overflow-hidden rounded-card-nested border">
            {items.map((item) => {
              const focus = focusExcerpt(item.focusNext);
              const current = item.key === currentKey;
              return (
                <li key={item.key}>
                  <Link
                    href={routes.studio.reviewWeek(item.key)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm transition-colors outline-hidden hover:bg-muted/50 focus-visible:bg-muted",
                      current && "bg-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-medium">{weekRangeLabel(item.weekStart, { short: true })}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {item.targetMet && <CheckCircle2 className="size-3.5 text-success" aria-hidden />}
                          {item.postedCount === null
                            ? `${EMPTY_VALUE} post`
                            : `${item.postedCount}/${item.target} post`}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {focus ? `Fokus: ${focus}` : "Fokus belum diisi"}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
