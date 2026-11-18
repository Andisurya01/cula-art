// Antrean ide offline (E10): logika murni, tanpa IndexedDB/React, supaya bisa diuji.
// Halaman offline (public/studio-offline.html) menulis antrean ke IndexedDB dengan nama/versi/store yang sama;
// Studio mengirimnya lewat createQuickIdea saat online (event `online` dan saat Studio dibuka).
//
// "Sekali, tidak dobel": setiap ide membawa `id` acak yang dikirim sebagai `offlineId` (unik di database),
// jadi kirim ulang setelah respons hilang tidak membuat ide kedua. Satu tab saja yang mengirim (Web Locks),
// dan ide dihapus dari antrean hanya setelah server menjawab berhasil.

import { z } from "zod";
import type { ActionResult } from "@/lib/action";
import { NETWORK_ERROR_MESSAGE } from "@/lib/action-client";
import { MEDIUMS } from "@/lib/labels";

/** Harus sama dengan konstanta di public/studio-offline.html (dicek test). */
export const OFFLINE_IDEA_DB = { name: "studio-offline", version: 1, store: "ideas" } as const;

/** Event window saat isi antrean berubah (badge diperbarui). */
export const OFFLINE_QUEUE_EVENT = "studio:offline-queue";

/** Service worker Studio: file statis di luar /studio (tanpa login), scope Beranda + semua /studio/*. */
export const SERVICE_WORKER_URL = "/studio-sw.js";
export const SERVICE_WORKER_SCOPE = "/studio";
/** Awalan nama cache service worker (dihapus saat logout). */
export const STUDIO_CACHE_PREFIX = "studio-";

export const queuedIdeaSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  medium: z.enum(MEDIUMS).nullable(),
  /** Hanya dari dialog + Ide di Studio; halaman offline tidak punya daftar pilar. */
  pillarId: z.string().min(1).max(100).nullable().optional(),
  createdAt: z.number().finite(),
});
export type QueuedIdea = z.infer<typeof queuedIdeaSchema>;

/** Masukan `createQuickIdea` untuk satu ide antrean. */
export function toQuickIdeaInput(item: QueuedIdea) {
  return {
    title: item.title,
    ...(item.medium ? { medium: item.medium } : {}),
    ...(item.pillarId ? { pillarId: item.pillarId } : {}),
    offlineId: item.id,
  };
}

/**
 * Pisahkan isi IndexedDB: ide sah (urut waktu dicatat, lalu id) dan isian rusak.
 * Isian rusak yang punya id dibuang dari antrean; yang tanpa id tidak bisa dihapus dan diabaikan.
 */
export function prepareQueue(raw: readonly unknown[]): { valid: QueuedIdea[]; invalidIds: string[] } {
  const valid: QueuedIdea[] = [];
  const invalidIds: string[] = [];
  for (const entry of raw) {
    const parsed = queuedIdeaSchema.safeParse(entry);
    if (parsed.success) valid.push(parsed.data);
    else {
      const id = (entry as { id?: unknown } | null)?.id;
      if (typeof id === "string" && id) invalidIds.push(id);
    }
  }
  valid.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  return { valid, invalidIds };
}

/** ok = tersimpan (atau sudah pernah tersimpan); invalid = ditolak permanen; retry = coba lagi nanti. */
export type SendOutcome = "ok" | "invalid" | "retry";

/** Hasil Server Action → nasib ide di antrean. Gagal jaringan/server dicoba lagi; ditolak validasi dibuang. */
export function classifyResult(result: ActionResult<unknown>): SendOutcome {
  if (result.ok) return "ok";
  return result.error === NETWORK_ERROR_MESSAGE ? "retry" : "invalid";
}

export type SyncReport = {
  synced: QueuedIdea[];
  /** Ditolak server atau rusak; dibuang supaya antrean tidak macet. */
  dropped: QueuedIdea[];
  /** Masih di antrean (gagal jaringan); dikirim lagi nanti. */
  remaining: number;
};

/**
 * Kirim antrean satu per satu (urut waktu dicatat). Ide dihapus dari antrean hanya setelah server menjawab
 * berhasil. Gagal jaringan menghentikan pengiriman (sisanya menunggu online berikutnya).
 */
export async function syncQueue(
  raw: readonly unknown[],
  deps: { send: (item: QueuedIdea) => Promise<SendOutcome>; remove: (id: string) => Promise<void> },
): Promise<SyncReport> {
  const { valid, invalidIds } = prepareQueue(raw);
  for (const id of invalidIds) await deps.remove(id);

  const report: SyncReport = { synced: [], dropped: [], remaining: 0 };
  for (let i = 0; i < valid.length; i++) {
    const item = valid[i]!;
    let outcome: SendOutcome;
    try {
      outcome = await deps.send(item);
    } catch {
      outcome = "retry";
    }
    if (outcome === "retry") {
      report.remaining = valid.length - i;
      break;
    }
    await deps.remove(item.id);
    (outcome === "ok" ? report.synced : report.dropped).push(item);
  }
  return report;
}

/** "1 ide menunggu sinkron". */
export function queueBadgeText(count: number): string | null {
  return count > 0 ? `${count} ide menunggu sinkron` : null;
}
