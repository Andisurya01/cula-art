import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ExportTable, ExportTables } from "./json";
import { EXPORT_TABLES } from "./json";
import type {
  ArtworkExportRow,
  ContentExportRow,
  FollowerExportRow,
  IdeaExportRow,
  PostExportRow,
} from "./sheets";

// Data ekspor (E11). Setiap file = satu findMany; relasi dibaca Prisma per tingkat (WHERE … IN),
// jadi 1.000 post tetap beberapa query saja, tanpa query per baris.

const named = { select: { name: true } } as const;

export function getIdeaExportRows(): Promise<IdeaExportRow[]> {
  return db.idea.findMany({
    select: {
      id: true,
      title: true,
      notes: true,
      medium: true,
      potential: true,
      effort: true,
      status: true,
      refUrl: true,
      createdAt: true,
      updatedAt: true,
      pillar: named,
      content: { select: { id: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export function getContentExportRows(): Promise<ContentExportRow[]> {
  return db.content.findMany({
    select: {
      id: true,
      title: true,
      stage: true,
      stageChangedAt: true,
      seriesPart: true,
      hookText: true,
      script: true,
      shotList: true,
      targetDurationSec: true,
      ideaId: true,
      createdAt: true,
      updatedAt: true,
      pillar: named,
      format: named,
      hookType: named,
      project: { select: { title: true } },
      posts: { select: { platform: true } },
      checklist: { select: { done: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export function getPostExportRows(): Promise<PostExportRow[]> {
  return db.post.findMany({
    select: {
      id: true,
      contentId: true,
      platform: true,
      postType: true,
      scheduledAt: true,
      postedAt: true,
      url: true,
      durationSec: true,
      caption: true,
      hashtags: true,
      externalId: true,
      content: { select: { title: true, pillar: named, format: named, hookType: named } },
      snapshots: {
        where: { kind: { in: ["H1", "H7"] } },
        select: {
          kind: true,
          source: true,
          recordedAt: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
          saves: true,
          follows: true,
          avgWatchSec: true,
          completionRate: true,
        },
      },
    },
    orderBy: [{ postedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }, { id: "asc" }],
  });
}

export function getFollowerExportRows(): Promise<FollowerExportRow[]> {
  return db.accountSnapshot.findMany({
    select: { platform: true, date: true, followers: true, source: true },
    orderBy: [{ date: "asc" }, { platform: "asc" }],
  });
}

export function getArtworkExportRows(): Promise<ArtworkExportRow[]> {
  return db.artwork.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      description: true,
      medium: true,
      year: true,
      widthCm: true,
      heightCm: true,
      depthCm: true,
      materials: true,
      weightGram: true,
      visibility: true,
      availability: true,
      priceIdr: true,
      showPrice: true,
      isFeatured: true,
      featuredOrder: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { title: true } },
      images: { select: { storageKey: true, isCover: true, isProcess: true } },
      contents: { select: { contentId: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

// ---- JSON lengkap ----

type TableQuery = () => Prisma.PrismaPromise<unknown[]>;

/**
 * Satu query per tabel di EXPORT_TABLES (Record memaksa setiap tabel punya query). Baris penuh
 * tanpa relasi; tabel auth tidak punya entri di sini.
 */
const TABLE_QUERIES: Record<ExportTable, TableQuery> = {
  Setting: () => db.setting.findMany({ orderBy: { id: "asc" } }),
  Pillar: () => db.pillar.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  Format: () => db.format.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  HookType: () => db.hookType.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ChecklistTemplateItem: () =>
    db.checklistTemplateItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
  Project: () => db.project.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ProjectPhoto: () => db.projectPhoto.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  Idea: () => db.idea.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  Content: () => db.content.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ChecklistItem: () => db.checklistItem.findMany({ orderBy: [{ contentId: "asc" }, { order: "asc" }, { id: "asc" }] }),
  Post: () => db.post.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  MetricSnapshot: () => db.metricSnapshot.findMany({ orderBy: [{ recordedAt: "asc" }, { id: "asc" }] }),
  AccountSnapshot: () => db.accountSnapshot.findMany({ orderBy: [{ date: "asc" }, { platform: "asc" }] }),
  Experiment: () => db.experiment.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ExperimentPost: () =>
    db.experimentPost.findMany({ orderBy: [{ experimentId: "asc" }, { variant: "asc" }, { postId: "asc" }] }),
  WeeklyReview: () => db.weeklyReview.findMany({ orderBy: { weekStart: "asc" } }),
  SuggestionDismissal: () => db.suggestionDismissal.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  Artwork: () => db.artwork.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ArtworkImage: () => db.artworkImage.findMany({ orderBy: [{ artworkId: "asc" }, { order: "asc" }, { id: "asc" }] }),
  ArtworkContent: () =>
    db.artworkContent.findMany({ orderBy: [{ artworkId: "asc" }, { order: "asc" }, { contentId: "asc" }] }),
  ArtworkSlugRedirect: () => db.artworkSlugRedirect.findMany({ orderBy: [{ createdAt: "asc" }, { oldSlug: "asc" }] }),
  AiGuide: () => db.aiGuide.findMany({ orderBy: { id: "asc" } }),
  AiRun: () => db.aiRun.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  // Tema tampilan (T15). Kosong = tampilan awal.
  ThemeSetting: () => db.themeSetting.findMany({ orderBy: { id: "asc" } }),
};

/** Semua tabel data dalam satu transaksi REPEATABLE READ, supaya isinya konsisten satu sama lain. */
export async function getExportTables(): Promise<ExportTables> {
  const results: unknown[][] = await db.$transaction(
    EXPORT_TABLES.map((table) => TABLE_QUERIES[table]()),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const entries = EXPORT_TABLES.map((table, i) => [table, results[i] ?? []] as const);
  return Object.fromEntries(entries) as Record<ExportTable, unknown[]>;
}
