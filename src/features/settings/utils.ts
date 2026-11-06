// Fungsi murni untuk menu Pengaturan (tanpa Prisma/React) — diuji di utils.test.ts.

import { slotKey, sortSlots, type FollowerTarget, type PostingSlot } from "./schema";

/**
 * Pindahkan `id` satu langkah ke atas/bawah dalam daftar berurutan.
 * Mengembalikan daftar baru, atau `null` jika tidak ada perubahan (sudah di ujung / id tidak ada).
 */
export function moveId(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const index = ids.indexOf(id);
  if (index === -1) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Total porsi target (%) dari pilar yang aktif saja. */
export function activeShareTotal(pillars: { targetShare: number; isActive: boolean }[]): number {
  return pillars.reduce((sum, p) => (p.isActive ? sum + p.targetShare : sum), 0);
}

export type AddSlotResult =
  | { ok: true; slots: PostingSlot[] }
  | { ok: false; error: string };

/** Tambah slot posting: tolak duplikat (hari + jam sama), hasil diurutkan Senin → Minggu. */
export function addSlot(slots: PostingSlot[], slot: PostingSlot, max = 21): AddSlotResult {
  if (slots.some((s) => slotKey(s) === slotKey(slot))) {
    return { ok: false, error: "Slot hari dan jam itu sudah ada" };
  }
  if (slots.length >= max) return { ok: false, error: `Maksimal ${max} slot` };
  return { ok: true, slots: sortSlots([...slots, slot]) };
}

/** Hapus slot berdasarkan hari + jam. */
export function removeSlot(slots: PostingSlot[], slot: PostingSlot): PostingSlot[] {
  const key = slotKey(slot);
  return slots.filter((s) => slotKey(s) !== key);
}

/** Target tersimpan → teks form Target 3 bulan; yang belum diisi jadi string kosong, ER memakai koma. */
export function followerTargetFormValues(target: FollowerTarget): Record<keyof FollowerTarget, string> {
  const count = (value: number | undefined) => (value === undefined ? "" : String(value));
  const percent = (value: number | undefined) => count(value).replace(".", ",");
  return {
    tiktokFollowers: count(target.tiktokFollowers),
    igFollowers: count(target.igFollowers),
    tiktokEr: percent(target.tiktokEr),
    igEr: percent(target.igEr),
  };
}
