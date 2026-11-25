"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IDEA_STATUS_LABELS, MEDIUMS, MEDIUM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  DEFAULT_IDEA_FILTERS,
  IDEA_SORTS,
  IDEA_SORT_LABELS,
  IDEA_STATUS_FILTERS,
  ideaFiltersToQuery,
  parseIdeaFilters,
  type IdeaFilters,
  type IdeaStatusFilter,
} from "../schema";
import { ChipButton } from "./chip-button";
import type { PillarOption } from "./types";

const ALL = "all";

const STATUS_PILL_LABELS: Record<IdeaStatusFilter, string> = {
  ...IDEA_STATUS_LABELS,
  ALL: "Semua",
};

/** Filter pilar / medium / status + urutan. Disimpan di search params URL. */
export function IdeaFiltersBar({
  filters,
  pillars,
}: {
  filters: IdeaFilters;
  pillars: PillarOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function apply(next: IdeaFilters) {
    const query = ideaFiltersToQuery(next);
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function update(key: "pillar" | "medium" | "status" | "sort", value: string) {
    // Validasi ulang lewat parser yang sama dengan server.
    const raw = {
      pillar: filters.pillarId ?? undefined,
      medium: filters.medium ?? undefined,
      status: filters.status,
      sort: filters.sort,
      [key]: value === ALL ? undefined : value,
    };
    apply(parseIdeaFilters(raw));
  }

  const isDefault = ideaFiltersToQuery(filters) === ideaFiltersToQuery(DEFAULT_IDEA_FILTERS);

  return (
    <div className={cn("grid gap-3", pending && "opacity-70")}>
      {/* Status = filter utama, berbentuk pil; pilar/medium/urutan tetap dropdown (opsinya bisa banyak). */}
      <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
        {IDEA_STATUS_FILTERS.map((s) => (
          <ChipButton key={s} active={filters.status === s} onClick={() => update("status", s)}>
            {STATUS_PILL_LABELS[s]}
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select value={filters.pillarId ?? ALL} onValueChange={(v) => update("pillar", v)}>
          <SelectTrigger className="w-full rounded-button sm:w-44" aria-label="Filter pilar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua pilar</SelectItem>
            {pillars.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.medium ?? ALL} onValueChange={(v) => update("medium", v)}>
          <SelectTrigger className="w-full rounded-button sm:w-36" aria-label="Filter medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua medium</SelectItem>
            {MEDIUMS.map((m) => (
              <SelectItem key={m} value={m}>
                {MEDIUM_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger className="col-span-2 w-full rounded-button sm:w-40" aria-label="Urutkan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDEA_SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {IDEA_SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-2 justify-self-start sm:col-span-1"
            onClick={() => apply(DEFAULT_IDEA_FILTERS)}
          >
            <X />
            Reset filter
          </Button>
        )}
      </div>
    </div>
  );
}
