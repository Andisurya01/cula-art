"use client";

import { ArrowRightLeft } from "lucide-react";
import type { ContentStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTENT_STAGES, CONTENT_STAGE_LABELS } from "@/lib/labels";

/** Menu "Pindah ke…" di kartu (pengganti drag di HP). */
export function MoveStageMenu({
  current,
  title,
  onMove,
}: {
  current: ContentStage;
  title: string;
  onMove: (stage: ContentStage) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Pindah stage: ${title}`}>
          <ArrowRightLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Pindah ke…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CONTENT_STAGES.filter((stage) => stage !== current).map((stage) => (
          <DropdownMenuItem key={stage} onSelect={() => onMove(stage)}>
            {CONTENT_STAGE_LABELS[stage]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
