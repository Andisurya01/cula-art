import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { IdeaFilters } from "./schema";
import { sortIdeas } from "./score";

const ideaListSelect = {
  id: true,
  title: true,
  notes: true,
  medium: true,
  potential: true,
  effort: true,
  status: true,
  refUrl: true,
  pillarId: true,
  createdAt: true,
  pillar: { select: { id: true, name: true, color: true } },
  content: { select: { id: true, stage: true } },
} satisfies Prisma.IdeaSelect;

export type IdeaListItem = Prisma.IdeaGetPayload<{ select: typeof ideaListSelect }>;

/** Daftar ide sesuai filter, sudah diurutkan (terbaru atau skor gabungan). */
export async function getIdeas(filters: IdeaFilters): Promise<IdeaListItem[]> {
  const where: Prisma.IdeaWhereInput = {};
  if (filters.status !== "ALL") where.status = filters.status;
  if (filters.pillarId) where.pillarId = filters.pillarId;
  if (filters.medium) where.medium = filters.medium;

  const ideas = await db.idea.findMany({
    where,
    select: ideaListSelect,
    orderBy: { createdAt: "desc" },
  });
  return sortIdeas(ideas, filters.sort);
}

/** Jumlah ide berstatus Baru (untuk banner "bank ide menipis") + total semua ide. */
export async function getIdeaCounts() {
  const [newCount, total] = await Promise.all([
    db.idea.count({ where: { status: "NEW" } }),
    db.idea.count(),
  ]);
  return { newCount, total };
}
