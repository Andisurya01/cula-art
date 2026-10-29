"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CalendarPlus, GripVertical } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Button } from "@/components/ui/button";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import type { ReadyContent } from "../schedule";

export type ReadyDragData = { contentId: string };

/** Panel "Siap Posting": konten stage READY yang bisa di-drag ke slot (desktop) atau dijadwalkan lewat dialog. */
export function ReadyPanel({
  ready,
  onSchedule,
}: {
  ready: ReadyContent[];
  onSchedule: (content: ReadyContent) => void;
}) {
  return (
    <section aria-labelledby="ready-panel-title" className="rounded-xl border p-3">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="ready-panel-title" className="text-sm font-semibold">
          Siap Posting
        </h2>
        <span className="text-xs text-muted-foreground">{ready.length} konten</span>
      </div>
      {ready.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Belum ada konten Siap Posting. Pindahkan konten ke kolom Siap Posting di{" "}
          <Link href={routes.studio.pipeline} className="underline underline-offset-2">
            Pipeline
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-2 hidden text-xs text-muted-foreground md:block">
            Seret kartu ke slot kosong, atau tekan Jadwalkan.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {ready.map((content) => (
              <li key={content.id}>
                <ReadyCard content={content} onSchedule={() => onSchedule(content)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReadyCard({ content, onSchedule }: { content: ReadyContent; onSchedule: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ready:${content.id}`,
    data: { contentId: content.id } satisfies ReadyDragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex gap-1.5 rounded-lg border border-l-4 bg-card p-2",
        isDragging && "opacity-40",
      )}
      style={{ borderLeftColor: content.pillarColor }}
    >
      <button
        type="button"
        aria-label={`Seret ${content.title} ke slot`}
        className="-ml-1 hidden w-5 shrink-0 cursor-grab touch-none items-start justify-center pt-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing md:flex"
        {...attributes}
        {...listeners}
        tabIndex={-1}
      >
        <GripVertical className="size-4" />
      </button>
      <ReadyCardBody content={content} onSchedule={onSchedule} />
    </div>
  );
}

/** Isi kartu (juga dipakai sebagai pratinjau DragOverlay tanpa tombol). */
export function ReadyCardBody({
  content,
  onSchedule,
}: {
  content: ReadyContent;
  onSchedule?: () => void;
}) {
  return (
    <div className="grid min-w-0 flex-1 gap-1.5">
      <Link
        href={routes.studio.content(content.id)}
        className="truncate text-sm font-medium hover:underline"
        title={content.title}
      >
        {content.title}
      </Link>
      <PillarBadge name={content.pillarName} color={content.pillarColor} className="text-muted-foreground" />
      <ul className="grid gap-0.5 text-xs text-muted-foreground">
        {PLATFORMS.map((platform) => {
          const version = content.versions.find((v) => v.platform === platform);
          return (
            <li key={platform} className="flex gap-1">
              <span className="w-16 shrink-0 text-foreground/80">{PLATFORM_LABELS[platform]}</span>
              <span className="truncate">{versionText(version)}</span>
            </li>
          );
        })}
      </ul>
      {onSchedule && (
        <Button type="button" size="sm" variant="secondary" className="justify-self-start" onClick={onSchedule}>
          <CalendarPlus />
          Jadwalkan
        </Button>
      )}
    </div>
  );
}

function versionText(version: ReadyContent["versions"][number] | undefined): string {
  if (!version) return "Belum ada versi";
  if (version.postedAt) return `Diposting ${formatWib(version.postedAt, "EEE d MMM HH.mm")}`;
  if (version.scheduledAt) return formatWib(version.scheduledAt, "EEE d MMM HH.mm");
  return "Belum dijadwalkan";
}
