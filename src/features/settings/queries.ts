import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_POSTING_SLOTS,
  parseFollowerTarget,
  parsePostingSlots,
  parseScoreWeights,
} from "./schema";
import { DEFAULT_SCORE_WEIGHTS } from "@/lib/analytics/metrics";

export const SETTING_ID = "default";

/** Isi awal baris Setting; dipakai semua upsert supaya baris baru tidak kehilangan default. */
export function settingCreateData() {
  return {
    id: SETTING_ID,
    postingSlotsJson: JSON.stringify(DEFAULT_POSTING_SLOTS),
    scoreWeightsJson: JSON.stringify(DEFAULT_SCORE_WEIGHTS),
  };
}

/**
 * Baca dulu, buat hanya jika belum ada. Bukan `upsert`: halaman Studio memanggil ini paralel dengan
 * query lain, dan dua upsert bersamaan pada tabel kosong saling menabrak (P2002).
 */
async function loadSettingRow() {
  const existing = await db.setting.findUnique({ where: { id: SETTING_ID } });
  if (existing) return existing;
  try {
    return await db.setting.create({ data: settingCreateData() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.setting.findUniqueOrThrow({ where: { id: SETTING_ID } });
    }
    throw error;
  }
}

/** Setting satu baris, sudah di-parse. Dibuat dengan default jika belum ada. Sekali per request. */
export const getSettings = cache(async () => {
  const row = await loadSettingRow();
  return {
    weeklyPostTarget: row.weeklyPostTarget,
    postingSlots: parsePostingSlots(row.postingSlotsJson),
    scoreWeights: parseScoreWeights(row.scoreWeightsJson),
    followerTarget: parseFollowerTarget(row.followerTargetJson),
    /** Profil publik Galeri (tab "Profil publik"); handle TikTok/IG juga dipakai Galeri. */
    profile: {
      siteName: row.siteName,
      tagline: row.tagline,
      bio: row.bio,
      aboutText: row.aboutText,
      avatarKey: row.avatarKey,
      city: row.city,
      whatsapp: row.whatsapp,
      contactEmail: row.contactEmail,
      igHandle: row.igHandle,
      tiktokHandle: row.tiktokHandle,
    },
  };
});
export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Daftar master (pilar/format/hook). `includeInactive` untuk Pengaturan. */
export async function getTaxonomies(options: { includeInactive?: boolean } = {}) {
  const where = options.includeInactive ? {} : { isActive: true };
  const orderBy = [{ order: "asc" as const }, { name: "asc" as const }];
  const [pillars, formats, hookTypes] = await Promise.all([
    db.pillar.findMany({ where, orderBy }),
    db.format.findMany({ where, orderBy }),
    db.hookType.findMany({ where, orderBy }),
  ]);
  return { pillars, formats, hookTypes };
}
export type Taxonomies = Awaited<ReturnType<typeof getTaxonomies>>;

/**
 * Data halaman Pengaturan: semua master (termasuk nonaktif) + jumlah pemakaian,
 * supaya UI tahu kapan boleh Hapus dan kapan hanya Nonaktifkan.
 */
export async function getSettingsPageData() {
  const orderBy = [{ order: "asc" as const }, { name: "asc" as const }];
  const [settings, pillars, formats, hookTypes, checklist] = await Promise.all([
    getSettings(),
    db.pillar.findMany({
      orderBy,
      include: { _count: { select: { ideas: true, contents: true } } },
    }),
    db.format.findMany({ orderBy, include: { _count: { select: { contents: true } } } }),
    db.hookType.findMany({ orderBy, include: { _count: { select: { contents: true } } } }),
    db.checklistTemplateItem.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }] }),
  ]);

  return {
    settings,
    pillars: pillars.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      targetShare: p.targetShare,
      isActive: p.isActive,
      usageCount: p._count.ideas + p._count.contents,
    })),
    formats: formats.map((f) => ({
      id: f.id,
      name: f.name,
      isActive: f.isActive,
      usageCount: f._count.contents,
    })),
    hookTypes: hookTypes.map((h) => ({
      id: h.id,
      name: h.name,
      isActive: h.isActive,
      usageCount: h._count.contents,
    })),
    checklist: checklist.map((c) => ({
      id: c.id,
      name: c.label,
      isActive: c.isActive,
      usageCount: 0, // item checklist konten menyalin label, jadi template selalu boleh dihapus
    })),
  };
}
export type SettingsPageData = Awaited<ReturnType<typeof getSettingsPageData>>;
export type PillarRow = SettingsPageData["pillars"][number];
export type SimpleListRow = SettingsPageData["formats"][number];
