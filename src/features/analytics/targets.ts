// Fungsi murni: target 3 bulan per platform (D11). Target opsional, jadi `null` = tidak ditampilkan.

import type { Platform } from "@prisma/client";
import { formatCount, formatPercent } from "@/features/metrics/format";
import type { FollowerTarget } from "@/features/settings/schema";

export type PlatformTarget = { followers: number | null; er: number | null };

export function platformTarget(target: FollowerTarget, platform: Platform): PlatformTarget {
  return platform === "TIKTOK"
    ? { followers: target.tiktokFollowers ?? null, er: target.tiktokEr ?? null }
    : { followers: target.igFollowers ?? null, er: target.igEr ?? null };
}

/** "Target 3 bulan: 5.000 (sekarang 3.400)"; `current` = snapshot terakhir, tidak terikat rentang. */
export function followerTargetNote(target: number | null, current: number | null): string | null {
  if (target === null) return null;
  const now = current === null ? "" : ` (sekarang ${formatCount(current)})`;
  return `Target 3 bulan: ${formatCount(target)}${now}`;
}

/** "Target 3 bulan: 8,0%". */
export function erTargetNote(target: number | null): string | null {
  return target === null ? null : `Target 3 bulan: ${formatPercent(target)}`;
}
