import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { POSTED_COLUMN_LIMIT, type PipelineCard } from "./board";

const cardSelect = {
  id: true,
  title: true,
  stage: true,
  stageChangedAt: true,
  createdAt: true,
  seriesPart: true,
  pillar: { select: { id: true, name: true, color: true } },
  format: { select: { id: true, name: true } },
  posts: {
    select: { platform: true, postType: true, scheduledAt: true, postedAt: true, url: true },
    orderBy: { platform: "asc" as const },
  },
} as const;

/** Data kanban: semua konten yang belum Posted + Posted terbaru (dibatasi). */
export async function getPipelineBoard() {
  const [active, posted, postedTotal, pillars] = await Promise.all([
    db.content.findMany({
      where: { stage: { not: "POSTED" } },
      select: cardSelect,
      orderBy: { stageChangedAt: "asc" },
    }),
    db.content.findMany({
      where: { stage: "POSTED" },
      select: cardSelect,
      orderBy: { stageChangedAt: "desc" },
      take: POSTED_COLUMN_LIMIT,
    }),
    db.content.count({ where: { stage: "POSTED" } }),
    db.pillar.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    }),
  ]);

  const cards: PipelineCard[] = [...active, ...posted];
  return { cards, postedTotal, pillars, now: new Date() };
}
export type PipelineBoardData = Awaited<ReturnType<typeof getPipelineBoard>>;

/**
 * Detail konten lengkap untuk `/studio/pipeline/[id]`, atau `null` jika tidak ada.
 * Di-`cache` per request karena dipakai `generateMetadata` dan halaman.
 */
export const getContentDetail = cache(async (id: string) => {
  const content = await db.content.findUnique({
    where: { id },
    include: {
      pillar: { select: { id: true, name: true, color: true } },
      idea: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
      checklist: {
        select: { id: true, label: true, done: true, order: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      posts: {
        select: {
          id: true,
          platform: true,
          postType: true,
          caption: true,
          hashtags: true,
          scheduledAt: true,
          postedAt: true,
          url: true,
          durationSec: true,
          updatedAt: true,
        },
        orderBy: { platform: "asc" },
      },
    },
  });
  if (!content) return null;

  const activeOr = (currentId: string | null) =>
    currentId ? { OR: [{ isActive: true }, { id: currentId }] } : { isActive: true };
  const orderBy = [{ order: "asc" as const }, { name: "asc" as const }];
  const select = { id: true, name: true, isActive: true } as const;

  const [pillars, formats, hookTypes, projects] = await Promise.all([
    db.pillar.findMany({
      where: activeOr(content.pillarId),
      orderBy,
      select: { ...select, color: true },
    }),
    db.format.findMany({ where: activeOr(content.formatId), orderBy, select }),
    db.hookType.findMany({ where: activeOr(content.hookTypeId), orderBy, select }),
    db.project.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true },
    }),
  ]);

  return {
    content,
    options: { pillars, formats, hookTypes, projects },
    now: new Date(),
  };
});
export type ContentDetailData = NonNullable<Awaited<ReturnType<typeof getContentDetail>>>;
export type ContentDetail = ContentDetailData["content"];
export type ContentDetailOptions = ContentDetailData["options"];
export type ContentPost = ContentDetail["posts"][number];
export type ContentChecklistItem = ContentDetail["checklist"][number];
