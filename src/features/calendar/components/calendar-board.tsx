"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Platform } from "@prisma/client";
import type { PostingSlot } from "@/features/settings/schema";
import { formatWib, parseWibInputValue, toWibDateString } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { scheduleContent } from "../actions";
import { itemsByDate } from "../day-items";
import type { CalendarView } from "../range";
import {
  applyScheduleToPosts,
  applyScheduleToReady,
  defaultPlatforms,
  schedulablePlatforms,
  type CalendarPost,
  type ReadyContent,
} from "../schedule";
import type { ScheduleContentInput } from "../schema";
import { buildSlots, upcomingEmptySlots } from "../slots";
import { MonthView } from "./month-view";
import { ReadyCardBody, ReadyPanel, type ReadyDragData } from "./ready-panel";
import { ScheduleDialog } from "./schedule-dialog";
import type { SlotDropData } from "./slot-box";
import { WeekView } from "./week-view";

type Snapshot = { posts: CalendarPost[]; ready: ReadyContent[] };
type ScheduleVars = { content: ReadyContent; platforms: Platform[]; scheduledAt: string };

export function CalendarBoard({
  view,
  date,
  days,
  now,
  postingSlots,
  posts: serverPosts,
  ready: serverReady,
}: {
  view: CalendarView;
  date: string;
  days: Date[];
  now: Date;
  postingSlots: PostingSlot[];
  posts: CalendarPost[];
  ready: ReadyContent[];
}) {
  const router = useRouter();

  // State lokal untuk optimistic update; disinkronkan ulang setiap data server berubah.
  const [source, setSource] = useState<Snapshot>({ posts: serverPosts, ready: serverReady });
  const [local, setLocal] = useState<Snapshot>(source);
  // Tunda sinkron selama masih ada penjadwalan berjalan (lihat useSyncedState di Pipeline).
  const mutating = useIsMutating() > 0;
  if (!mutating && (source.posts !== serverPosts || source.ready !== serverReady)) {
    const next = { posts: serverPosts, ready: serverReady };
    setSource(next);
    setLocal(next);
  }

  const [dialogContent, setDialogContent] = useState<ReadyContent | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ content, platforms, scheduledAt }: ScheduleVars) => {
      const result = await scheduleContent({ contentId: content.id, platforms, scheduledAt });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onMutate: ({ content, platforms, scheduledAt }): Snapshot => {
      const snapshot = local;
      const at = parseWibInputValue(scheduledAt);
      setLocal({
        posts: applyScheduleToPosts(snapshot.posts, content, platforms, at),
        ready: applyScheduleToReady(snapshot.ready, content.id, platforms, at),
      });
      return snapshot;
    },
    onError: (error, _vars, snapshot) => {
      if (snapshot) setLocal(snapshot);
      toast.error(error instanceof Error ? error.message : "Gagal menjadwalkan");
    },
    onSuccess: ({ scheduled, skipped }, { scheduledAt }) => {
      const when = formatWib(parseWibInputValue(scheduledAt), "EEE d MMM, HH.mm");
      const names = scheduled.map((p) => PLATFORM_LABELS[p]).join(" & ");
      const skippedText = skipped.length
        ? ` (${skipped.map((p) => PLATFORM_LABELS[p]).join(" & ")} sudah diposting)`
        : "";
      toast.success(`${names} dijadwalkan ${when} WIB${skippedText}`);
    },
    onSettled: () => router.refresh(),
  });

  function schedule(content: ReadyContent, platforms: Platform[], scheduledAt: string) {
    if (schedulablePlatforms(content, platforms).length === 0) {
      toast.error("Semua versi konten ini sudah diposting");
      return;
    }
    mutation.mutate({ content, platforms, scheduledAt });
  }

  const slotPosts = local.posts;
  const slots = buildSlots(days, postingSlots, slotPosts, now);
  const items = itemsByDate(local.posts, slots);
  const upcoming = upcomingEmptySlots(postingSlots, slotPosts, now);
  const todayKey = toWibDateString(now);

  // Hanya pointer: pengguna keyboard/HP memakai tombol Jadwalkan.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as ReadyDragData | undefined;
    setDraggingId(data?.contentId ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const drag = event.active.data.current as ReadyDragData | undefined;
    const drop = event.over?.data.current as SlotDropData | undefined;
    if (!drag || !drop) return;
    const content = local.ready.find((c) => c.id === drag.contentId);
    if (!content || drop.slot.filled || drop.slot.at.getTime() <= Date.now()) return;
    schedule(content, defaultPlatforms(content), drop.slot.key);
  }

  function onDialogSubmit(values: ScheduleContentInput) {
    if (!dialogContent) return;
    setDialogContent(null);
    schedule(dialogContent, values.platforms, values.scheduledAt);
  }

  const dragging = draggingId ? local.ready.find((c) => c.id === draggingId) : undefined;

  return (
    <DndContext
      id="kalender-dnd"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="order-1 min-w-0 md:order-2 xl:order-1">
          {view === "week" ? (
            <WeekView days={days} items={items} todayKey={todayKey} />
          ) : (
            <MonthView days={days} items={items} todayKey={todayKey} anchorKey={date} />
          )}
        </div>
        <aside className="order-2 md:order-1 xl:order-2 xl:sticky xl:top-6 xl:self-start">
          <ReadyPanel ready={local.ready} onSchedule={setDialogContent} />
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div
            className="w-64 rounded-lg border border-l-4 bg-card p-2 shadow-lg"
            style={{ borderLeftColor: dragging.pillarColor }}
          >
            <ReadyCardBody content={dragging} />
          </div>
        )}
      </DragOverlay>

      {dialogContent && (
        <ScheduleDialog
          key={dialogContent.id}
          content={dialogContent}
          upcomingSlots={upcoming}
          now={now}
          open
          onOpenChange={(open) => {
            if (!open) setDialogContent(null);
          }}
          onSubmit={onDialogSubmit}
        />
      )}
    </DndContext>
  );
}
