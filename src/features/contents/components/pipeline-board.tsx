"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ContentStage } from "@prisma/client";
import { CONTENT_STAGE_LABELS } from "@/lib/labels";
import { groupCardsByStage, moveCard, restoreCard, type PipelineCard } from "../board";
import { moveContentStage } from "../actions";
import { errorMessage, unwrap, useSyncedState } from "./client-utils";
import { KanbanBoard } from "./kanban-board";
import { MarkPostedDialog, type PostedDialogTarget } from "./mark-posted-dialog";
import { MobileBoard } from "./mobile-board";

type Previous = { stage: ContentStage; stageChangedAt: Date };
type MoveVariables = { id: string; stage: ContentStage; previous: Previous };

/** Pipeline: kanban drag (≥ 768 px) atau tab per kolom (HP), dengan optimistic update + rollback. */
export function PipelineBoard({
  cards: initialCards,
  postedTotal,
  now,
}: {
  cards: PipelineCard[];
  postedTotal: number;
  now: Date;
}) {
  const router = useRouter();
  const [cards, setCards] = useSyncedState(initialCards);
  const [posted, setPosted] = useState<(PostedDialogTarget & { previous: Previous }) | null>(null);
  const columns = useMemo(() => groupCardsByStage(cards), [cards]);

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: MoveVariables) => unwrap(moveContentStage({ id, stage })),
    onMutate: ({ id, stage }) => {
      setCards((current) => moveCard(current, id, stage, new Date()));
    },
    onSuccess: (_data, { stage }) => {
      toast.success(`Dipindah ke ${CONTENT_STAGE_LABELS[stage]}`);
    },
    onError: (error, { id, previous }) => {
      setCards((current) => restoreCard(current, id, previous));
      toast.error(errorMessage(error));
    },
    onSettled: () => router.refresh(),
  });

  function requestMove(id: string, stage: ContentStage) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.stage === stage) return;
    const previous = { stage: card.stage, stageChangedAt: card.stageChangedAt };

    if (stage === "POSTED") {
      // Kartu langsung pindah; dialog wajib diisi. Batal → kembali ke kolom asal.
      const openedAt = new Date();
      setCards((current) => moveCard(current, id, "POSTED", openedAt));
      setPosted({ contentId: id, title: card.title, posts: card.posts, openedAt, previous });
      return;
    }
    moveMutation.mutate({ id, stage, previous });
  }

  function cancelPosted() {
    if (!posted) return;
    setCards((current) => restoreCard(current, posted.contentId, posted.previous));
    setPosted(null);
  }

  function onPosted() {
    setPosted(null);
    router.refresh();
  }

  return (
    <>
      <div className="hidden md:block">
        <KanbanBoard columns={columns} postedTotal={postedTotal} now={now} onMove={requestMove} />
      </div>
      <div className="md:hidden">
        <MobileBoard columns={columns} postedTotal={postedTotal} now={now} onMove={requestMove} />
      </div>
      <MarkPostedDialog target={posted} onCancel={cancelPosted} onPosted={onPosted} />
    </>
  );
}
