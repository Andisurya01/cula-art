// Fungsi murni: snapshot yang dipakai (D5) dan status metrik (D3) dari docs/FASE-4.md.
// Tidak boleh import Prisma, React, atau Next.

export type SnapshotKindValue = "H1" | "H7" | "CUSTOM";

/** Jenis snapshot yang punya form dan dipakai untuk angka: H+1 dan H+7. */
export type MetricKind = "H1" | "H7";

export type MetricStatus = "WAITING_H1" | "NEED_H1" | "WAITING_H7" | "NEED_H7" | "COMPLETE";

const DAY_MS = 86_400_000;
export const H1_DUE_AFTER_MS = DAY_MS;
export const H7_DUE_AFTER_MS = 7 * DAY_MS;

function findKind<T extends { kind: SnapshotKindValue }>(
  snapshots: readonly T[],
  kind: MetricKind,
): (T & { kind: MetricKind }) | null {
  const found = snapshots.find((s) => s.kind === kind);
  return found ? (found as T & { kind: MetricKind }) : null;
}

/** H+7, cadangan H+1 (D5). CUSTOM tidak pernah dipakai. Tanpa keduanya → `null`. */
export function pickBestSnapshot<T extends { kind: SnapshotKindValue }>(
  snapshots: readonly T[],
): (T & { kind: MetricKind }) | null {
  return findKind(snapshots, "H7") ?? findKind(snapshots, "H1");
}

/**
 * Status metrik satu post, dihitung dari `postedAt` tanpa tabel jadwal (D3):
 * ada H+7 → Lengkap; ≥ 7 hari tanpa H+7 → Perlu H+7 (H+1 tidak ditagih lagi);
 * ada H+1 → Menunggu H+7; ≥ 24 jam tanpa H+1 → Perlu H+1; selain itu Menunggu H+1.
 */
export function metricStatus(
  postedAt: Date,
  snapshots: readonly { kind: SnapshotKindValue }[],
  now: Date,
): MetricStatus {
  if (findKind(snapshots, "H7")) return "COMPLETE";
  const age = now.getTime() - postedAt.getTime();
  if (age >= H7_DUE_AFTER_MS) return "NEED_H7";
  if (findKind(snapshots, "H1")) return "WAITING_H7";
  return age >= H1_DUE_AFTER_MS ? "NEED_H1" : "WAITING_H1";
}

/** Metrik sudah waktunya diisi (badge "Perlu"). */
export function isMetricDue(status: MetricStatus): boolean {
  return status === "NEED_H1" || status === "NEED_H7";
}

/** Jenis form yang dibuka untuk status ini. Lengkap tetap membuka H+7 supaya bisa diperbaiki. */
export function nextMetricKind(status: MetricStatus): MetricKind {
  return status === "WAITING_H1" || status === "NEED_H1" ? "H1" : "H7";
}

export type PendingMetric<T> = { post: T; status: MetricStatus; kind: MetricKind };

/**
 * Post yang metriknya tertunda. H+1 lebih dulu, karena hanya ditagih sampai hari ke-7 dan tidak boleh
 * tertimbun tunggakan H+7 lama. Dalam jenis yang sama, yang paling lama lewat lebih dulu.
 */
export function pendingMetrics<T extends { postedAt: Date; snapshots: readonly { kind: SnapshotKindValue }[] }>(
  posts: readonly T[],
  now: Date,
): PendingMetric<T>[] {
  const pending: PendingMetric<T>[] = [];
  for (const post of posts) {
    const status = metricStatus(post.postedAt, post.snapshots, now);
    if (isMetricDue(status)) pending.push({ post, status, kind: nextMetricKind(status) });
  }
  return pending.sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.post.postedAt.getTime() - b.post.postedAt.getTime(),
  );
}
