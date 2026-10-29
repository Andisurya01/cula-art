"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action";
import { routes } from "@/lib/routes";
import { deleteFilesQuietly } from "@/lib/storage";
import { requireAdmin } from "@/features/auth/dal";
import { revalidateGallery } from "@/features/gallery/revalidate";
import { replaceAvatarKey } from "./profile-photo";
import { SETTING_ID, settingCreateData } from "./queries";
import {
  createSimpleItemSchema,
  deleteItemSchema,
  generalSettingsSchema,
  moveItemSchema,
  pillarInputSchema,
  postingSlotsInputSchema,
  publicProfileSchema,
  renameSimpleItemSchema,
  scoreWeightsInputSchema,
  setActiveSchema,
  sortSlots,
  updatePillarSchema,
  type MasterKind,
  type SimpleListKind,
} from "./schema";
import { moveId } from "./utils";

type Tx = Prisma.TransactionClient;

const KIND_LABELS: Record<MasterKind, string> = {
  pillar: "Pilar",
  format: "Format",
  hookType: "Tipe hook",
  checklist: "Item checklist",
};

/** Pilar/format/hook dipakai di banyak halaman (dialog + Ide global, Pipeline, Proyek…). */
function revalidateFor(kind: MasterKind) {
  revalidatePath(routes.studio.settings);
  if (kind !== "checklist") revalidatePath(routes.studio.home, "layout");
}

function revalidateSettingRow() {
  revalidatePath(routes.studio.settings);
  revalidatePath(routes.studio.home);
  revalidatePath(routes.studio.calendar);
  revalidatePath(routes.studio.analytics);
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isForeignKeyError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/** Pesan ramah untuk bentrok nama unik; beri tahu jika yang bentrok sedang nonaktif. */
async function duplicateNameMessage(kind: MasterKind, name: string): Promise<string> {
  const existing = await findByName(kind, name);
  const label = KIND_LABELS[kind];
  if (existing && !existing.isActive) {
    return `${label} "${name}" sudah ada tapi nonaktif. Aktifkan lagi dari daftar.`;
  }
  return `${label} "${name}" sudah ada. Pakai nama lain.`;
}

async function findByName(kind: MasterKind, name: string) {
  const select = { isActive: true };
  switch (kind) {
    case "pillar":
      return db.pillar.findUnique({ where: { name }, select });
    case "format":
      return db.format.findUnique({ where: { name }, select });
    case "hookType":
      return db.hookType.findUnique({ where: { name }, select });
    case "checklist":
      return db.checklistTemplateItem.findUnique({ where: { label: name }, select });
  }
}

async function nextOrder(tx: Tx, kind: MasterKind): Promise<number> {
  const args = { _max: { order: true } } as const;
  const result =
    kind === "pillar"
      ? await tx.pillar.aggregate(args)
      : kind === "format"
        ? await tx.format.aggregate(args)
        : kind === "hookType"
          ? await tx.hookType.aggregate(args)
          : await tx.checklistTemplateItem.aggregate(args);
  return (result._max.order ?? -1) + 1;
}

async function listOrderedIds(tx: Tx, kind: MasterKind): Promise<string[]> {
  const select = { id: true };
  const rows =
    kind === "pillar"
      ? await tx.pillar.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select })
      : kind === "format"
        ? await tx.format.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select })
        : kind === "hookType"
          ? await tx.hookType.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select })
          : await tx.checklistTemplateItem.findMany({
              orderBy: [{ order: "asc" }, { label: "asc" }],
              select,
            });
  return rows.map((r) => r.id);
}

async function setOrder(tx: Tx, kind: MasterKind, id: string, order: number) {
  const args = { where: { id }, data: { order } };
  switch (kind) {
    case "pillar":
      return tx.pillar.update(args);
    case "format":
      return tx.format.update(args);
    case "hookType":
      return tx.hookType.update(args);
    case "checklist":
      return tx.checklistTemplateItem.update(args);
  }
}

async function usageCount(tx: Tx, kind: MasterKind, id: string): Promise<number> {
  switch (kind) {
    case "pillar": {
      const [ideas, contents] = await Promise.all([
        tx.idea.count({ where: { pillarId: id } }),
        tx.content.count({ where: { pillarId: id } }),
      ]);
      return ideas + contents;
    }
    case "format":
      return tx.content.count({ where: { formatId: id } });
    case "hookType":
      return tx.content.count({ where: { hookTypeId: id } });
    case "checklist":
      return 0;
  }
}

/** Konten baru wajib punya pilar, jadi minimal satu pilar harus tetap aktif. */
async function isLastActivePillar(tx: Tx, id: string): Promise<boolean> {
  const active = await tx.pillar.findMany({ where: { isActive: true }, select: { id: true } });
  return active.length === 1 && active[0].id === id;
}

// ---------------------------------------------------------------------------
// Pilar
// ---------------------------------------------------------------------------

export async function createPillar(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = pillarInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, description, color, targetShare } = parsed.data;

  try {
    const pillar = await db.$transaction(async (tx) =>
      tx.pillar.create({
        data: {
          name,
          description: description ?? null,
          color,
          targetShare,
          order: await nextOrder(tx, "pillar"),
        },
      }),
    );
    revalidateFor("pillar");
    return ok({ id: pillar.id });
  } catch (error) {
    if (isUniqueError(error)) return fail(await duplicateNameMessage("pillar", name));
    throw error;
  }
}

export async function updatePillar(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updatePillarSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, name, description, color, targetShare } = parsed.data;

  try {
    await db.pillar.update({
      where: { id },
      data: { name, description: description ?? null, color, targetShare },
    });
  } catch (error) {
    if (isUniqueError(error)) return fail(await duplicateNameMessage("pillar", name));
    if (isNotFoundError(error)) return fail("Pilar tidak ditemukan. Muat ulang halaman.");
    throw error;
  }
  revalidateFor("pillar");
  return ok();
}

// ---------------------------------------------------------------------------
// Format, tipe hook, item checklist (daftar sederhana)
// ---------------------------------------------------------------------------

async function createSimple(tx: Tx, kind: SimpleListKind, name: string) {
  const order = await nextOrder(tx, kind);
  switch (kind) {
    case "format":
      return tx.format.create({ data: { name, order } });
    case "hookType":
      return tx.hookType.create({ data: { name, order } });
    case "checklist":
      return tx.checklistTemplateItem.create({ data: { label: name, order } });
  }
}

export async function createSimpleItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createSimpleItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { kind, name } = parsed.data;

  try {
    const item = await db.$transaction((tx) => createSimple(tx, kind, name));
    revalidateFor(kind);
    return ok({ id: item.id });
  } catch (error) {
    if (isUniqueError(error)) return fail(await duplicateNameMessage(kind, name));
    throw error;
  }
}

export async function renameSimpleItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = renameSimpleItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { kind, id, name } = parsed.data;

  try {
    switch (kind) {
      case "format":
        await db.format.update({ where: { id }, data: { name } });
        break;
      case "hookType":
        await db.hookType.update({ where: { id }, data: { name } });
        break;
      case "checklist":
        await db.checklistTemplateItem.update({ where: { id }, data: { label: name } });
        break;
    }
  } catch (error) {
    if (isUniqueError(error)) return fail(await duplicateNameMessage(kind, name));
    if (isNotFoundError(error)) return fail("Data tidak ditemukan. Muat ulang halaman.");
    throw error;
  }
  revalidateFor(kind);
  return ok();
}

// ---------------------------------------------------------------------------
// Aksi bersama semua daftar master
// ---------------------------------------------------------------------------

export async function setItemActive(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { kind, id, isActive } = parsed.data;

  try {
    const result = await db.$transaction(async (tx): Promise<ActionResult> => {
      if (kind === "pillar" && !isActive && (await isLastActivePillar(tx, id))) {
        return fail("Minimal satu pilar harus aktif.");
      }
      const args = { where: { id }, data: { isActive } };
      switch (kind) {
        case "pillar":
          await tx.pillar.update(args);
          break;
        case "format":
          await tx.format.update(args);
          break;
        case "hookType":
          await tx.hookType.update(args);
          break;
        case "checklist":
          await tx.checklistTemplateItem.update(args);
          break;
      }
      return ok();
    });
    if (!result.ok) return result;
  } catch (error) {
    if (isNotFoundError(error)) return fail("Data tidak ditemukan. Muat ulang halaman.");
    throw error;
  }
  revalidateFor(kind);
  return ok();
}

export async function moveItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = moveItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { kind, id, direction } = parsed.data;

  await db.$transaction(async (tx) => {
    const ids = await listOrderedIds(tx, kind);
    const next = moveId(ids, id, direction);
    if (!next) return;
    // Normalisasi: order = posisi (data seed bisa punya order yang sama).
    for (const [index, itemId] of next.entries()) {
      await setOrder(tx, kind, itemId, index);
    }
  });
  revalidateFor(kind);
  return ok();
}

export async function deleteItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { kind, id } = parsed.data;
  const label = KIND_LABELS[kind];
  const inUse = `${label} sudah dipakai sehingga tidak bisa dihapus. Nonaktifkan saja.`;

  try {
    const result = await db.$transaction(async (tx): Promise<ActionResult> => {
      if ((await usageCount(tx, kind, id)) > 0) return fail(inUse);
      if (kind === "pillar" && (await isLastActivePillar(tx, id))) {
        return fail("Minimal satu pilar harus aktif.");
      }
      const args = { where: { id } };
      switch (kind) {
        case "pillar":
          await tx.pillar.delete(args);
          break;
        case "format":
          await tx.format.delete(args);
          break;
        case "hookType":
          await tx.hookType.delete(args);
          break;
        case "checklist":
          await tx.checklistTemplateItem.delete(args);
          break;
      }
      return ok();
    });
    if (!result.ok) return result;
  } catch (error) {
    if (isForeignKeyError(error)) return fail(inUse);
    if (isNotFoundError(error)) return fail("Data sudah terhapus. Muat ulang halaman.");
    throw error;
  }
  revalidateFor(kind);
  return ok();
}

// ---------------------------------------------------------------------------
// Baris Setting (target, slot, bobot skor, profil publik)
// ---------------------------------------------------------------------------

/** Target mingguan saja; handle TikTok/IG disimpan lewat `updatePublicProfile`. */
export async function updateGeneralSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  await db.setting.upsert({
    where: { id: SETTING_ID },
    update: parsed.data,
    create: { ...settingCreateData(), ...parsed.data },
  });
  revalidateSettingRow();
  return ok();
}

/** Profil publik Galeri: nama situs, tagline, bio, cerita Tentang, kontak, handle sosial. */
export async function updatePublicProfile(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = publicProfileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  await db.setting.upsert({
    where: { id: SETTING_ID },
    update: parsed.data,
    create: { ...settingCreateData(), ...parsed.data },
  });
  revalidatePath(routes.studio.settings);
  revalidateGallery({ profile: true });
  return ok();
}

/** Hapus foto profil: kosongkan `avatarKey`, lalu hapus filenya. */
export async function removeProfilePhoto(): Promise<ActionResult> {
  await requireAdmin();
  const previousKey = await replaceAvatarKey(null);
  await deleteFilesQuietly([previousKey]);
  revalidatePath(routes.studio.settings);
  revalidateGallery({ profile: true });
  return ok();
}

export async function updatePostingSlots(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = postingSlotsInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const postingSlotsJson = JSON.stringify(sortSlots(parsed.data));
  await db.setting.upsert({
    where: { id: SETTING_ID },
    update: { postingSlotsJson },
    create: { id: SETTING_ID, postingSlotsJson },
  });
  revalidateSettingRow();
  return ok();
}

export async function updateScoreWeights(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = scoreWeightsInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const scoreWeightsJson = JSON.stringify(parsed.data);
  await db.setting.upsert({
    where: { id: SETTING_ID },
    update: { scoreWeightsJson },
    create: { id: SETTING_ID, scoreWeightsJson },
  });
  revalidateSettingRow();
  return ok();
}
