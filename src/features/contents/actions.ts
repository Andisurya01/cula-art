"use server";

import type { ContentStage, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { parseWibInputValue } from "@/lib/date";
import { DEFAULT_POST_TYPE } from "@/lib/labels";
import { requireAdmin } from "@/features/auth/dal";
import { hasPublishedPost } from "./board";
import { ContentRuleError, revalidateContent } from "./revalidate";
import {
  checklistAddSchema,
  checklistToggleSchema,
  contentIdSchema,
  createContentSchema,
  markPostedSchema,
  moveStageSchema,
  updateContentSchema,
} from "./schema";
import { createContentWithChecklist } from "./service";

const POSTED_RULE_MESSAGE =
  "Konten Posted butuh minimal satu versi platform dengan URL dan waktu posting";

/** PRD: setiap konten wajib punya pilar, format, dan tipe hook (dasar analitik). Boleh kosong selama produksi. */
const TAGS_REQUIRED_STAGES: readonly ContentStage[] = ["READY", "POSTED"];
const TAGS_RULE_MESSAGE =
  "Lengkapi format dan tipe hook dulu di detail konten sebelum pindah ke Siap Posting atau Posted";

function hasRequiredTags(content: { formatId: string | null; hookTypeId: string | null }) {
  return content.formatId !== null && content.hookTypeId !== null;
}

/** Jalankan transaksi; `ContentRuleError` diubah menjadi `fail(...)`. */
async function runTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await db.$transaction(fn) };
  } catch (error) {
    if (error instanceof ContentRuleError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createContent(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createContentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await runTx(async (tx) => {
    const pillar = await tx.pillar.findUnique({ where: { id: parsed.data.pillarId } });
    if (!pillar || !pillar.isActive) throw new ContentRuleError("Pilar tidak ditemukan atau nonaktif");
    return createContentWithChecklist(tx, parsed.data);
  });
  if (!result.ok) return fail(result.error);

  revalidateContent();
  return ok({ id: result.value.id });
}

export async function updateContent(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateContentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, ...data } = parsed.data;

  const result = await runTx(async (tx) => {
    const current = await tx.content.findUnique({ where: { id } });
    if (!current) throw new ContentRuleError("Konten tidak ditemukan");

    // Pilihan baru harus aktif; pilihan lama yang sudah nonaktif tetap boleh dipertahankan.
    if (data.pillarId !== current.pillarId) {
      const pillar = await tx.pillar.findUnique({ where: { id: data.pillarId } });
      if (!pillar?.isActive) throw new ContentRuleError("Pilar tidak ditemukan atau nonaktif");
    }
    if (data.formatId && data.formatId !== current.formatId) {
      const format = await tx.format.findUnique({ where: { id: data.formatId } });
      if (!format?.isActive) throw new ContentRuleError("Format tidak ditemukan atau nonaktif");
    }
    if (data.hookTypeId && data.hookTypeId !== current.hookTypeId) {
      const hookType = await tx.hookType.findUnique({ where: { id: data.hookTypeId } });
      if (!hookType?.isActive) throw new ContentRuleError("Tipe hook tidak ditemukan atau nonaktif");
    }
    if (TAGS_REQUIRED_STAGES.includes(current.stage) && !hasRequiredTags(data)) {
      throw new ContentRuleError(
        "Konten Siap Posting/Posted wajib punya format dan tipe hook; jangan dikosongkan",
      );
    }
    if (data.projectId && data.projectId !== current.projectId) {
      const project = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!project) throw new ContentRuleError("Proyek tidak ditemukan");
    }

    await tx.content.update({ where: { id }, data });
  });
  if (!result.ok) return fail(result.error);

  revalidateContent(id);
  return ok();
}

/** Pindah stage (kanban, menu "Pindah ke…", detail). Ke POSTED hanya jika aturan Posted terpenuhi. */
export async function moveContentStage(
  input: unknown,
): Promise<ActionResult<{ stage: ContentStage; stageChangedAt: Date }>> {
  await requireAdmin();
  const parsed = moveStageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, stage } = parsed.data;

  const result = await runTx(async (tx) => {
    const current = await tx.content.findUnique({
      where: { id },
      select: {
        stage: true,
        stageChangedAt: true,
        formatId: true,
        hookTypeId: true,
        posts: { select: { url: true, postedAt: true } },
      },
    });
    if (!current) throw new ContentRuleError("Konten tidak ditemukan");
    if (current.stage === stage) return current;
    if (TAGS_REQUIRED_STAGES.includes(stage) && !hasRequiredTags(current)) {
      throw new ContentRuleError(TAGS_RULE_MESSAGE);
    }
    if (stage === "POSTED" && !hasPublishedPost(current.posts)) {
      throw new ContentRuleError(POSTED_RULE_MESSAGE);
    }
    return tx.content.update({
      where: { id },
      data: { stage, stageChangedAt: new Date() },
      select: { stage: true, stageChangedAt: true },
    });
  });
  if (!result.ok) return fail(result.error);

  revalidateContent(id);
  return ok({ stage: result.value.stage, stageChangedAt: result.value.stageChangedAt });
}

/**
 * Pindah ke Posted: simpan URL + waktu posting per platform (buat Post jika belum ada),
 * lalu set stage POSTED. Semua dalam satu transaksi.
 */
export async function markContentPosted(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = markPostedSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { contentId, entries } = parsed.data;

  const maxPostedAt = Date.now() + 10 * 60_000; // toleransi jam HP vs server
  const values = entries.map((entry) => ({ ...entry, postedAt: parseWibInputValue(entry.postedAt) }));
  if (values.some((v) => Number.isNaN(v.postedAt.getTime()))) {
    return fail("Waktu posting tidak valid");
  }
  if (values.some((v) => v.postedAt.getTime() > maxPostedAt)) {
    return fail("Waktu posting tidak boleh di masa depan");
  }

  const result = await runTx(async (tx) => {
    const content = await tx.content.findUnique({
      where: { id: contentId },
      select: { stage: true, formatId: true, hookTypeId: true },
    });
    if (!content) throw new ContentRuleError("Konten tidak ditemukan");
    if (!hasRequiredTags(content)) throw new ContentRuleError(TAGS_RULE_MESSAGE);

    for (const value of values) {
      await tx.post.upsert({
        where: { contentId_platform: { contentId, platform: value.platform } },
        update: { url: value.url, postedAt: value.postedAt },
        create: {
          contentId,
          platform: value.platform,
          postType: DEFAULT_POST_TYPE[value.platform],
          url: value.url,
          postedAt: value.postedAt,
        },
      });
    }

    const posts = await tx.post.findMany({
      where: { contentId },
      select: { url: true, postedAt: true },
    });
    if (!hasPublishedPost(posts)) throw new ContentRuleError(POSTED_RULE_MESSAGE);

    if (content.stage !== "POSTED") {
      await tx.content.update({
        where: { id: contentId },
        data: { stage: "POSTED", stageChangedAt: new Date() },
      });
    }
  });
  if (!result.ok) return fail(result.error);

  revalidateContent(contentId);
  return ok();
}

/** Hapus konten (Post + checklist ikut terhapus). Ide asal dikembalikan ke status Baru. */
export async function deleteContent(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = contentIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await runTx(async (tx) => {
    const content = await tx.content.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, ideaId: true },
    });
    if (!content) throw new ContentRuleError("Konten tidak ditemukan");
    await tx.content.delete({ where: { id: content.id } });
    if (content.ideaId) {
      // Ide yang sudah diarsipkan tetap di arsip; hanya yang Dipilih kembali ke Baru.
      await tx.idea.updateMany({
        where: { id: content.ideaId, status: "PICKED" },
        data: { status: "NEW" },
      });
    }
  });
  if (!result.ok) return fail(result.error);

  // Jangan revalidate halaman detail yang baru dihapus: halaman yang sedang terbuka
  // akan dirender ulang dan sempat menampilkan 404 sebelum client pindah ke /pipeline.
  revalidateContent(undefined, { skipDetail: true });
  return ok();
}

// --- Checklist -------------------------------------------------------------

export async function toggleChecklistItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = checklistToggleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const item = await db.checklistItem.findUnique({
    where: { id: parsed.data.id },
    select: { contentId: true },
  });
  if (!item) return fail("Item checklist tidak ditemukan");

  await db.checklistItem.update({ where: { id: parsed.data.id }, data: { done: parsed.data.done } });
  revalidateContent(item.contentId);
  return ok();
}

export async function addChecklistItem(
  input: unknown,
): Promise<ActionResult<{ id: string; label: string; done: boolean; order: number }>> {
  await requireAdmin();
  const parsed = checklistAddSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { contentId, label } = parsed.data;

  const result = await runTx(async (tx) => {
    const content = await tx.content.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!content) throw new ContentRuleError("Konten tidak ditemukan");
    const last = await tx.checklistItem.findFirst({
      where: { contentId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    return tx.checklistItem.create({
      data: { contentId, label, order: (last?.order ?? -1) + 1 },
      select: { id: true, label: true, done: true, order: true },
    });
  });
  if (!result.ok) return fail(result.error);

  revalidateContent(contentId);
  return ok(result.value);
}

export async function deleteChecklistItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = contentIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const item = await db.checklistItem.findUnique({
    where: { id: parsed.data.id },
    select: { contentId: true },
  });
  if (!item) return fail("Item checklist tidak ditemukan");

  await db.checklistItem.delete({ where: { id: parsed.data.id } });
  revalidateContent(item.contentId);
  return ok();
}
