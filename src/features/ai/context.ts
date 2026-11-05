import "server-only";
import { db } from "@/lib/db";
import { toWibDateString } from "@/lib/date";
import {
  CONTENT_STAGE_LABELS,
  MEDIUM_LABELS,
  PLATFORM_LABELS,
  POST_TYPE_LABELS,
  PROJECT_STAGE_LABELS,
} from "@/lib/labels";
import type { AiFeature } from "./features";
import type { AiContext, AiInput } from "./prompts";
import type { ContentContext, ContentFormInput } from "./prompts/content-common";
import { MAX_PROJECT_PHOTOS } from "./prompts/project-ideas";
import type { TaxonomyNames } from "./prompts/types";

// Pengumpul data per fitur. Hanya field yang diizinkan (allowlist) yang masuk konteks; tidak pernah
// harga, kontak, sesi, atau data akun. Nilai form dari client dipakai apa adanya (boleh belum disimpan),
// sedangkan nama kategori dan data relasi dibaca dari database.

/** Pesan untuk pengguna saat data yang diminta tidak ada. */
export class AiContextError extends Error {}

export type Taxonomy = {
  /** Semua kategori (termasuk nonaktif), untuk mencari nama dari id yang dipilih di form. */
  byId: Map<string, string>;
  /** Hanya kategori aktif: pilihan output AI. */
  names: TaxonomyNames;
  /** Untuk render Panduan AI. */
  pillars: { id: string; name: string; description: string | null }[];
};

export async function loadTaxonomy(): Promise<Taxonomy> {
  const orderBy = [{ order: "asc" as const }, { name: "asc" as const }];
  const [pillars, formats, hookTypes] = await Promise.all([
    db.pillar.findMany({ orderBy, select: { id: true, name: true, description: true, isActive: true } }),
    db.format.findMany({ orderBy, select: { id: true, name: true, isActive: true } }),
    db.hookType.findMany({ orderBy, select: { id: true, name: true, isActive: true } }),
  ]);
  const active = <T extends { isActive: boolean }>(list: T[]) => list.filter((x) => x.isActive);
  return {
    byId: new Map([...pillars, ...formats, ...hookTypes].map((x) => [x.id, x.name])),
    names: {
      pillars: active(pillars).map((p) => p.name),
      formats: active(formats).map((f) => f.name),
      hookTypes: active(hookTypes).map((h) => h.name),
    },
    pillars: active(pillars).map(({ id, name, description }) => ({ id, name, description })),
  };
}

export type LoadedContext<C> = { context: C; targetId: string | null };

type Loaders = { [F in AiFeature]: (input: AiInput<F>, taxonomy: Taxonomy) => Promise<LoadedContext<AiContext<F>>> };

const nameOf = (taxonomy: Taxonomy, id: string | null | undefined) => (id ? (taxonomy.byId.get(id) ?? null) : null);

async function contentContext(input: ContentFormInput, taxonomy: Taxonomy): Promise<ContentContext> {
  const [project, content] = await Promise.all([
    input.projectId
      ? db.project.findUnique({ where: { id: input.projectId }, select: { title: true, medium: true, stage: true } })
      : null,
    input.contentId
      ? db.content.findUnique({ where: { id: input.contentId }, select: { idea: { select: { notes: true } } } })
      : null,
  ]);
  return {
    title: input.title,
    pillar: nameOf(taxonomy, input.pillarId),
    format: nameOf(taxonomy, input.formatId),
    hookType: nameOf(taxonomy, input.hookTypeId),
    hookText: input.hookText?.trim() || null,
    script: input.script?.trim() || null,
    shotList: input.shotList?.trim() || null,
    targetDurationSec: input.targetDurationSec ?? null,
    project: project && {
      title: project.title,
      medium: MEDIUM_LABELS[project.medium],
      stage: PROJECT_STAGE_LABELS[project.stage],
    },
    seriesPart: input.seriesPart ?? null,
    ideaNotes: content?.idea?.notes ?? null,
  };
}

export const CONTEXT_LOADERS: Loaders = {
  "idea-expand": async (input, taxonomy) => ({
    targetId: input.ideaId ?? null,
    context: {
      title: input.title,
      notes: input.notes?.trim() || null,
      medium: input.medium ? MEDIUM_LABELS[input.medium] : null,
      pillar: nameOf(taxonomy, input.pillarId),
    },
  }),

  "project-ideas": async (input) => {
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      select: {
        title: true,
        medium: true,
        stage: true,
        startDate: true,
        notes: true,
        photos: {
          orderBy: [{ takenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
          take: 20,
          select: { caption: true, takenAt: true, storageKey: true },
        },
        contents: {
          orderBy: [{ seriesPart: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
          take: 30,
          select: { title: true, seriesPart: true, stage: true },
        },
      },
    });
    if (!project) throw new AiContextError("Proyek tidak ditemukan.");
    const uploaded = project.photos.filter((p) => p.storageKey);
    const photos = input.includePhotos
      ? uploaded.slice(0, MAX_PROJECT_PHOTOS).map((p, i) => ({
          label: `Foto ${i + 1}${p.takenAt ? ` (${toWibDateString(p.takenAt)})` : ""}${p.caption ? `: ${p.caption}` : ""}`,
          storageKey: p.storageKey as string,
        }))
      : [];
    return {
      targetId: input.projectId,
      context: {
        title: project.title,
        medium: MEDIUM_LABELS[project.medium],
        stage: PROJECT_STAGE_LABELS[project.stage],
        startDate: project.startDate ? toWibDateString(project.startDate) : null,
        notes: project.notes,
        photoLog: project.photos.map((p) => ({
          date: p.takenAt ? toWibDateString(p.takenAt) : null,
          caption: p.caption,
        })),
        contents: project.contents.map((c) => ({
          title: c.title,
          seriesPart: c.seriesPart,
          stage: CONTENT_STAGE_LABELS[c.stage],
        })),
        photos,
      },
    };
  },

  hook: async (input, taxonomy) => ({
    targetId: input.contentId ?? null,
    context: await contentContext(input, taxonomy),
  }),

  script: async (input, taxonomy) => ({
    targetId: input.contentId ?? null,
    context: await contentContext(input, taxonomy),
  }),

  caption: async (input, taxonomy) => ({
    targetId: input.postId ?? input.contentId ?? null,
    context: {
      ...(await contentContext(input, taxonomy)),
      platform: PLATFORM_LABELS[input.platform],
      postType: input.postType ? POST_TYPE_LABELS[input.postType] : null,
      caption: input.caption?.trim() || null,
      hashtags: input.hashtags?.trim() || null,
    },
  }),

  "artwork-photos": async (input) => {
    const artwork = await db.artwork.findUnique({
      where: { id: input.artworkId },
      select: {
        project: { select: { title: true, notes: true } },
        images: {
          where: { id: { in: input.imageIds } },
          select: { id: true, storageKey: true, alt: true, isProcess: true },
        },
      },
    });
    if (!artwork) throw new AiContextError("Karya tidak ditemukan.");
    // Urutan mengikuti pilihan pengguna; id yang bukan milik karya ini diabaikan.
    const images = input.imageIds
      .map((id) => artwork.images.find((img) => img.id === id))
      .filter((img) => img !== undefined);
    if (images.length === 0) throw new AiContextError("Foto yang dipilih tidak ditemukan. Muat ulang halaman.");
    const size = [input.widthCm, input.heightCm, input.depthCm].filter((v) => v !== null && v !== undefined);
    return {
      targetId: input.artworkId,
      context: {
        title: input.title?.trim() || null,
        medium: input.medium ? MEDIUM_LABELS[input.medium] : null,
        year: input.year ?? null,
        materials: input.materials?.trim() || null,
        size: size.length ? `${size.join(" × ")} cm` : null,
        userNotes: input.notes?.trim() || null,
        summary: input.summary?.trim() || null,
        description: input.description?.trim() || null,
        project: artwork.project,
        photos: images.map((img, i) => ({
          id: img.id,
          label: `Foto ${i + 1}`,
          storageKey: img.storageKey,
          isProcess: img.isProcess,
          currentAlt: img.alt,
        })),
      },
    };
  },
};
