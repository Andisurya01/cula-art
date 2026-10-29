// Tipe data kalender + fungsi murni untuk optimistic update penjadwalan (aman di client).

import type { Platform } from "@prisma/client";
import { PLATFORMS } from "@/lib/labels";

/** Post yang tampil di kalender. `at` = postedAt ?? scheduledAt. */
export type CalendarPost = {
  id: string;
  contentId: string;
  title: string;
  platform: Platform;
  pillarName: string;
  pillarColor: string;
  at: Date;
  posted: boolean;
};

export type ReadyVersion = {
  platform: Platform;
  scheduledAt: Date | null;
  postedAt: Date | null;
};

/** Konten stage READY untuk panel "Siap Posting". */
export type ReadyContent = {
  id: string;
  title: string;
  pillarName: string;
  pillarColor: string;
  versions: ReadyVersion[];
};

/** Platform yang sudah diposting (tidak boleh dijadwalkan ulang). */
export function postedPlatforms(content: ReadyContent): Platform[] {
  return content.versions.filter((v) => v.postedAt).map((v) => v.platform);
}

/**
 * Platform default saat menjadwalkan: versi yang sudah ada dan belum diposting; jika belum ada
 * versi yang bisa dijadwalkan, semua platform yang belum diposting (TikTok + Instagram).
 */
export function defaultPlatforms(content: ReadyContent): Platform[] {
  const existing = content.versions.filter((v) => !v.postedAt).map((v) => v.platform);
  if (existing.length > 0) return PLATFORMS.filter((p) => existing.includes(p));
  const posted = postedPlatforms(content);
  return PLATFORMS.filter((p) => !posted.includes(p));
}

/** Platform yang benar-benar akan dijadwalkan (yang sudah diposting dilewati). */
export function schedulablePlatforms(content: ReadyContent, platforms: Platform[]): Platform[] {
  const posted = postedPlatforms(content);
  return platforms.filter((p) => !posted.includes(p));
}

/** Terapkan jadwal baru ke daftar post kalender (optimistic). */
export function applyScheduleToPosts(
  posts: CalendarPost[],
  content: ReadyContent,
  platforms: Platform[],
  at: Date,
): CalendarPost[] {
  const targets = schedulablePlatforms(content, platforms);
  const kept = posts.filter(
    (p) => !(p.contentId === content.id && targets.includes(p.platform) && !p.posted),
  );
  const added: CalendarPost[] = targets.map((platform) => ({
    id: `optimistic-${content.id}-${platform}`,
    contentId: content.id,
    title: content.title,
    platform,
    pillarName: content.pillarName,
    pillarColor: content.pillarColor,
    at,
    posted: false,
  }));
  return [...kept, ...added];
}

/** Terapkan jadwal baru ke panel Siap Posting (optimistic). */
export function applyScheduleToReady(
  ready: ReadyContent[],
  contentId: string,
  platforms: Platform[],
  at: Date,
): ReadyContent[] {
  return ready.map((content) => {
    if (content.id !== contentId) return content;
    const targets = schedulablePlatforms(content, platforms);
    const versions = PLATFORMS.flatMap((platform): ReadyVersion[] => {
      const current = content.versions.find((v) => v.platform === platform);
      if (targets.includes(platform)) {
        return [{ platform, scheduledAt: at, postedAt: current?.postedAt ?? null }];
      }
      return current ? [current] : [];
    });
    return { ...content, versions };
  });
}
