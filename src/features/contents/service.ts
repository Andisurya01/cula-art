import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type NewContentInput = {
  title: string;
  pillarId: string;
  formatId?: string | null;
  hookTypeId?: string | null;
  ideaId?: string | null;
  projectId?: string | null;
  seriesPart?: number | null;
};

/**
 * Buat Content di stage PLANNING beserta checklist dari template aktif.
 * Dipakai oleh Jadikan Konten (ideas) dan Buat Seri (projects). Panggil di dalam `db.$transaction`.
 */
export async function createContentWithChecklist(tx: Tx, input: NewContentInput) {
  const template = await tx.checklistTemplateItem.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return tx.content.create({
    data: {
      title: input.title,
      pillarId: input.pillarId,
      formatId: input.formatId ?? null,
      hookTypeId: input.hookTypeId ?? null,
      ideaId: input.ideaId ?? null,
      projectId: input.projectId ?? null,
      seriesPart: input.seriesPart ?? null,
      stage: "PLANNING",
      stageChangedAt: new Date(),
      checklist: {
        create: template.map((item, index) => ({ label: item.label, order: index })),
      },
    },
  });
}
