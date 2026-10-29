"use client";

import { useId, useState } from "react";
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
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import type { ContentStage } from "@prisma/client";
import { CONTENT_STAGES, CONTENT_STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PipelineCard } from "../board";
import { ContentCardBody } from "./content-card";
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
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  function onDragStart(event: DragStartEvent) {
    setActiveCard((event.active.data.current?.card as PipelineCard | undefined) ?? null);
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
      <div className="-mx-1 overflow-x-auto px-1 pb-3">
        <div className="grid grid-cols-[repeat(5,minmax(15rem,1fr))] gap-3">
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
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-60 rotate-2 cursor-grabbing shadow-lg">
            <ContentCardBody card={activeCard} now={now} linked={false} />
          </div>
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
        "flex min-h-64 flex-col rounded-xl border bg-muted/40 p-2 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-sm font-semibold">{CONTENT_STAGE_LABELS[stage]}</h2>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} now={now} />
        ))}
        {cards.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
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
        "cursor-grab touch-manipulation rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isDragging && "opacity-40",
      )}
    >
      <ContentCardBody card={card} now={now} />
    </div>
  );
}
