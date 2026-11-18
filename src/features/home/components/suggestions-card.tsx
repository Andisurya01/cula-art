import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SuggestionView } from "@/features/suggestions/copy";
import { SuggestionList } from "@/features/suggestions/components/suggestion-list";
import { HOME_SUGGESTION_LIMIT, SUGGESTIONS_EMPTY_NOTE } from "../derive";

/** E6: 3 saran teratas (urut prioritas PRD), "Lihat semua (N)", dan Sembunyikan 7 hari per saran. */
export function SuggestionsCard({
  suggestions,
  className,
}: {
  suggestions: readonly SuggestionView[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Saran</CardTitle>
        <CardDescription>Dari data post dan pipeline, yang paling penting lebih dulu.</CardDescription>
      </CardHeader>
      <CardContent>
        <SuggestionList
          suggestions={suggestions}
          limit={HOME_SUGGESTION_LIMIT}
          empty={
            <>
              <span className="block font-medium text-foreground">Belum ada saran saat ini.</span>
              <span className="mt-1 block">{SUGGESTIONS_EMPTY_NOTE}</span>
            </>
          }
        />
      </CardContent>
    </Card>
  );
}
