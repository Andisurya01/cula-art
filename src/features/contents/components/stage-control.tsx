"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlarmClock } from "lucide-react";
import { toast } from "sonner";
import type { ContentStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { daysSince, isStale } from "@/lib/date";
import { CONTENT_STAGES, CONTENT_STAGE_LABELS } from "@/lib/labels";
import { moveContentStage } from "../actions";
import { errorMessage, unwrap, useSyncedState } from "./client-utils";
import { MarkPostedDialog, type PostedDialogPost, type PostedDialogTarget } from "./mark-posted-dialog";

type StageState = { stage: ContentStage; stageChangedAt: Date };

/** Pilihan stage di detail konten (optimistic). Ke Posted membuka dialog wajib. */
export function StageControl({
  contentId,
  title,
  stage,
  stageChangedAt,
  posts,
  now,
}: {
  contentId: string;
  title: string;
  stage: ContentStage;
  stageChangedAt: Date;
  posts: PostedDialogPost[];
  now: Date;
}) {
  const router = useRouter();
  const [state, setState] = useSyncedState<StageState>(
    { stage, stageChangedAt },
    `${stage}|${stageChangedAt.getTime()}`,
  );
  const [posted, setPosted] = useState<PostedDialogTarget | null>(null);

  const mutation = useMutation({
    mutationFn: (target: ContentStage) => unwrap(moveContentStage({ id: contentId, stage: target })),
    onMutate: (target) => {
      const previous = state;
      setState({ stage: target, stageChangedAt: new Date() });
      return { previous };
    },
    onSuccess: (_data, target) => toast.success(`Dipindah ke ${CONTENT_STAGE_LABELS[target]}`),
    onError: (error, _target, context) => {
      if (context) setState(context.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => router.refresh(),
  });

  function onChange(value: string) {
    const target = value as ContentStage;
    if (target === state.stage) return;
    if (target === "POSTED") {
      setPosted({ contentId, title, posts, openedAt: new Date() });
      return;
    }
    mutation.mutate(target);
  }

  const stale = state.stage !== "POSTED" && isStale(state.stageChangedAt, now);
  const days = Math.max(0, daysSince(state.stageChangedAt, now));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={state.stage} onValueChange={onChange} disabled={mutation.isPending}>
        <SelectTrigger aria-label="Stage" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {CONTENT_STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {stale ? (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <AlarmClock />
          Macet {days} hari
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">
          {days === 0 ? "Sejak hari ini" : `Sejak ${days} hari lalu`}
        </span>
      )}
      <MarkPostedDialog
        target={posted}
        onCancel={() => setPosted(null)}
        onPosted={() => {
          setPosted(null);
          setState({ stage: "POSTED", stageChangedAt: new Date() });
          router.refresh();
        }}
      />
    </div>
  );
}
