"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { parseWibInputValue } from "@/lib/date";
import { DEFAULT_POST_TYPE, PLATFORM_LABELS } from "@/lib/labels";
import { requireAdmin } from "@/features/auth/dal";
import { hasPublishedPost } from "@/features/contents/board";
import { ContentRuleError, revalidateContent } from "@/features/contents/revalidate";
import { createPostSchema, isPostTypeAllowed, postIdSchema, updatePostSchema } from "./schema";

const POSTED_RULE_MESSAGE =
  "Konten berstatus Posted butuh minimal satu versi dengan URL dan waktu posting. Pindahkan konten ke stage lain dulu.";

async function ensurePostedRule(tx: Prisma.TransactionClient, contentId: string) {
  const content = await tx.content.findUnique({
    where: { id: contentId },
    select: { stage: true, posts: { select: { url: true, postedAt: true } } },
  });
  if (content?.stage === "POSTED" && !hasPublishedPost(content.posts)) {
    throw new ContentRuleError(POSTED_RULE_MESSAGE);
  }
}

function toError(error: unknown): string | null {
  if (error instanceof ContentRuleError) return error.message;
  return null;
}

/** Tambah versi platform (maksimal satu per platform). */
export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { contentId, platform } = parsed.data;

  const content = await db.content.findUnique({ where: { id: contentId }, select: { id: true } });
  if (!content) return fail("Konten tidak ditemukan");

  try {
    const post = await db.post.create({
      data: { contentId, platform, postType: DEFAULT_POST_TYPE[platform] },
      select: { id: true },
    });
    revalidateContent(contentId);
    return ok({ id: post.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(`Versi ${PLATFORM_LABELS[platform]} sudah ada`);
    }
    throw error;
  }
}

export async function updatePost(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, scheduledAt, postedAt, ...rest } = parsed.data;

  const existing = await db.post.findUnique({
    where: { id },
    select: { contentId: true, platform: true },
  });
  if (!existing) return fail("Versi platform tidak ditemukan");
  if (!isPostTypeAllowed(existing.platform, rest.postType)) {
    return fail(`Tipe post tidak tersedia untuk ${PLATFORM_LABELS[existing.platform]}`);
  }

  const postedAtDate = postedAt ? parseWibInputValue(postedAt) : null;
  if (postedAtDate && postedAtDate.getTime() > Date.now() + 10 * 60_000) {
    return fail("Waktu posting tidak boleh di masa depan");
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: {
          ...rest,
          scheduledAt: scheduledAt ? parseWibInputValue(scheduledAt) : null,
          postedAt: postedAtDate,
        },
      });
      await ensurePostedRule(tx, existing.contentId);
    });
  } catch (error) {
    const message = toError(error);
    if (message) return fail(message);
    throw error;
  }

  revalidateContent(existing.contentId);
  return ok();
}

export async function deletePost(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = postIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await db.post.findUnique({
    where: { id: parsed.data.id },
    select: { contentId: true },
  });
  if (!existing) return fail("Versi platform tidak ditemukan");

  try {
    await db.$transaction(async (tx) => {
      await tx.post.delete({ where: { id: parsed.data.id } });
      await ensurePostedRule(tx, existing.contentId);
    });
  } catch (error) {
    const message = toError(error);
    if (message) return fail(message);
    throw error;
  }

  revalidateContent(existing.contentId);
  return ok();
}
