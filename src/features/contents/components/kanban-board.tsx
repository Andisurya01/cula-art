"use client";

import { useId, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import type { ContentStage } from "@prisma/client";
import { CONTENT_STAGES, CONTENT_STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PipelineCard } from "../board";
import { ContentCardBody } from "./content-card";
import { DragLift, dropAnimationFor, keyboardOverlayTransition } from "./drag-motion";
import { PostedLimitNote } from "./posted-limit-note";

type Columns = Record<ContentStage, PipelineCard[]>;

function isStage(value: unknown): value is ContentStage {
  return typeof value === "string" && (CONTENT_STAGES as readonly string[]).includes(value);
}

/** Pointer dulu (akurat untuk mouse/touch); keyboard tidak punya pointer → pakai irisan kotak. */
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

/** Panah kiri/kanan melompat ke kolom sebelah (bukan geser 25 px). */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const direction = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (direction === 0) return undefined;
  event.preventDefault();

  const overId = context.over?.id ?? context.active?.data.current?.stage;
  const index = isStage(overId) ? CONTENT_STAGES.indexOf(overId) : 0;
  const target = CONTENT_STAGES[index + direction];
  if (!target) return undefined;
  const rect = context.droppableRects.get(target);
  if (!rect) return undefined;
  return { x: rect.left + 8, y: rect.top + 48 };
};

const announcements: Announcements = {
  onDragStart: ({ active }) => `Mengangkat kartu ${active.data.current?.title ?? ""}.`,
  onDragOver: ({ over }) =>
    over && isStage(over.id) ? `Di atas kolom ${CONTENT_STAGE_LABELS[over.id]}.` : "Di luar kolom.",
  onDragEnd: ({ over }) =>
    over && isStage(over.id)
      ? `Kartu dilepas di kolom ${CONTENT_STAGE_LABELS[over.id]}.`
      : "Kartu dilepas, tidak dipindah.",
  onDragCancel: () => "Batal memindah kartu.",
};

const screenReaderInstructions = {
  draggable:
    "Tekan spasi atau Enter untuk mengangkat kartu. Panah kiri/kanan memindah ke kolom lain. Spasi atau Enter untuk melepas, Escape untuk batal.",
};

export function KanbanBoard({
  columns,
  postedTotal,
  now,
  onMove,
}: {
  columns: Columns;
  postedTotal: number;
  now: Date;
  onMove: (id: string, stage: ContentStage) => void;
}) {
  const dndId = useId();
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [dropAnimation, setDropAnimation] = useState<DropAnimation | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  function onDragStart(event: DragStartEvent) {
    setActiveCard((event.active.data.current?.card as PipelineCard | undefined) ?? null);
    // Token animasi dibaca saat mulai seret (DOM, bukan saat render). Saat dilepas, kartu meluncur ke
    // posisinya: kolom baru (data dipindah langsung oleh optimistic update), atau kembali jika batal.
    setDropAnimation(dropAnimationFor(boardRef.current));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const overId = event.over?.id;
    if (!isStage(overId)) return;
    onMove(String(event.active.id), overId);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveCard(null)}
    >
      <div ref={boardRef} className="-mx-1 -mt-1 overflow-x-auto px-1 pt-1 pb-3">
        <div className="grid grid-cols-[repeat(5,minmax(15rem,1fr))] gap-4">
          {CONTENT_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              cards={columns[stage]}
              now={now}
              footer={
                stage === "POSTED" ? (
                  <PostedLimitNote shown={columns.POSTED.length} total={postedTotal} />
                ) : null
              }
            />
          ))}
        </div>
      </div>
      {/* Lebar overlay = lebar kartu asal (dnd-kit), jadi kartu mendarat pas di tempatnya. */}
      <DragOverlay dropAnimation={dropAnimation} transition={keyboardOverlayTransition}>
        {activeCard ? (
          <DragLift className="cursor-grabbing rounded-card-nested shadow-lg">
            <ContentCardBody card={activeCard} now={now} linked={false} tone="muted" />
          </DragLift>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  cards,
  now,
  footer,
}: {
  stage: ContentStage;
  cards: PipelineCard[];
  now: Date;
  footer: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      aria-label={`Kolom ${CONTENT_STAGE_LABELS[stage]}`}
      className={cn(
        "flex min-h-64 flex-col rounded-card bg-card p-2.5 text-card-foreground ring-1 ring-border/70 transition-shadow",
        isOver && "ring-2 ring-primary",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-3">
        <h2 className="text-h6">{CONTENT_STAGE_LABELS[stage]}</h2>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} now={now} />
        ))}
        {cards.length === 0 && (
          <p className="rounded-card-nested border border-dashed p-4 text-center text-xs text-muted-foreground">
            Kosong
          </p>
        )}
      </div>
      {footer}
    </section>
  );
}

function DraggableCard({ card, now }: { card: PipelineCard; now: Date }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card, stage: card.stage, title: card.title },
  });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      {...attributes}
      {...listeners}
      aria-roledescription="kartu yang bisa dipindah"
      aria-label={`${card.title} — ${CONTENT_STAGE_LABELS[card.stage]}`}
      className={cn(
        "cursor-grab touch-manipulation rounded-card-nested outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      <ContentCardBody card={card} now={now} tone="muted" />
    </div>
  );
}
