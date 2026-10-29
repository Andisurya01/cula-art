"use client";

import { useState } from "react";
import type { ContentStage } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTENT_STAGES, CONTENT_STAGE_LABELS } from "@/lib/labels";
import type { PipelineCard } from "../board";
import { ContentCardBody } from "./content-card";
import { MoveStageMenu } from "./move-stage-menu";
import { PostedLimitNote } from "./posted-limit-note";

/** Pipeline di HP: tab per kolom (dengan jumlah kartu) + menu "Pindah ke…" di tiap kartu. */
export function MobileBoard({
  columns,
  postedTotal,
  now,
  onMove,
}: {
  columns: Record<ContentStage, PipelineCard[]>;
  postedTotal: number;
  now: Date;
  onMove: (id: string, stage: ContentStage) => void;
}) {
  const [tab, setTab] = useState<string>("PLANNING");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <TabsList className="w-max">
          {CONTENT_STAGES.map((stage) => (
            <TabsTrigger key={stage} value={stage} className="flex-none px-2.5">
              {CONTENT_STAGE_LABELS[stage]}
              <span className="text-xs text-muted-foreground tabular-nums">
                {columns[stage].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {CONTENT_STAGES.map((stage) => (
        <TabsContent key={stage} value={stage} className="grid gap-2">
          {columns[stage].map((card) => (
            <ContentCardBody
              key={card.id}
              card={card}
              now={now}
              action={
                <MoveStageMenu
                  current={card.stage}
                  title={card.title}
                  onMove={(target) => onMove(card.id, target)}
                />
              }
            />
          ))}
          {columns[stage].length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada konten di {CONTENT_STAGE_LABELS[stage]}.
            </p>
          )}
          {stage === "POSTED" && (
            <PostedLimitNote shown={columns.POSTED.length} total={postedTotal} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
