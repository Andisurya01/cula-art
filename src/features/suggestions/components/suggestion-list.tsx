"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuggestionView } from "../copy";
import { SuggestionCard } from "./suggestion-card";

/**
 * Daftar saran terurut prioritas. Dengan `limit`, hanya N teratas yang tampil plus "Lihat semua (N)"
 * yang membuka sisanya di tempat (E6). Saran yang baru disembunyikan langsung hilang dari daftar.
 */
export function SuggestionList({
  suggestions,
  limit,
  empty = "Tidak ada saran saat ini.",
}: {
  suggestions: readonly SuggestionView[];
  limit?: number;
  empty?: React.ReactNode;
}) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const visible = suggestions.filter((s) => !hidden.has(s.key));
  const shown = limit && !expanded ? visible.slice(0, limit) : visible;
  const rest = visible.length - shown.length;

  if (visible.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {shown.map((suggestion) => (
          <li key={suggestion.key}>
            <SuggestionCard
              suggestion={suggestion}
              onDismissed={(key) => setHidden((prev) => new Set([...prev, key]))}
            />
          </li>
        ))}
      </ul>
      {limit !== undefined && (rest > 0 || expanded) && visible.length > limit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? "Tampilkan lebih sedikit" : `Lihat semua (${visible.length})`}
        </Button>
      )}
    </div>
  );
}
