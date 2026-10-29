// Fungsi murni slot posting kalender (tanpa Prisma/React). Semua hari dihitung dalam WIB.

import type { PostingSlot } from "@/features/settings/schema";
import {
  addWibDays,
  startOfWibDay,
  toWibDateString,
  wibDaysBetween,
  wibIsoDay,
  wibToUtc,
} from "@/lib/date";

/** Toleransi pencocokan post ke slot: jam slot ± 2 jam (pada tanggal WIB yang sama). */
export const SLOT_TOLERANCE_MS = 2 * 60 * 60 * 1000;

/** Slot kosong yang tinggal ≤ 2 hari kalender WIB lagi diberi warna peringatan. */
export const SLOT_WARNING_DAYS = 2;

/** Jumlah hari ke depan (mulai hari ini) untuk daftar slot di dialog Jadwalkan. */
export const UPCOMING_SLOT_DAYS = 14;

/** `none` = aman / terisi, `soon` = kosong dan ≤ 2 hari lagi, `overdue` = kosong dan sudah lewat. */
export type SlotUrgency = "none" | "soon" | "overdue";

export type CalendarSlot = {
  /** `yyyy-MM-ddTHH:mm` (WIB), juga nilai yang dikirim ke action. */
  key: string;
  /** Tanggal WIB `yyyy-MM-dd`. */
  date: string;
  /** Jam WIB `HH:mm`. */
  time: string;
  /** Instant UTC slot. */
  at: Date;
  filled: boolean;
  urgency: SlotUrgency;
};

/** Minimal data post yang dibutuhkan untuk mengisi slot. `at` = postedAt ?? scheduledAt. */
export type SlotPost = { contentId: string; at: Date };

/**
 * Bangun slot posting untuk daftar hari (awal hari WIB), lalu tandai yang terisi.
 *
 * Aturan terisi: post pada tanggal WIB yang sama dengan selisih ≤ 2 jam dari jam slot.
 * Pencocokan satu-ke-satu (selisih terkecil dulu): satu slot diisi satu konten, dan satu
 * konten (berapa pun platformnya) mengisi paling banyak satu slot per hari — sehingga versi
 * TikTok + Instagram dari konten yang sama tidak menutup dua slot yang berdekatan.
 */
export function buildSlots(
  days: Date[],
  postingSlots: PostingSlot[],
  posts: SlotPost[],
  now: Date,
): CalendarSlot[] {
  const postsByDate = groupPostsByDate(posts);
  const result: CalendarSlot[] = [];

  for (const day of days) {
    const date = toWibDateString(day);
    const iso = wibIsoDay(wibToUtc(date, "12:00"));
    const daySlots = postingSlots
      .filter((s) => s.day === iso)
      .map((s) => s.time)
      .sort()
      .map((time) => ({ date, time, at: wibToUtc(date, time) }));
    if (daySlots.length === 0) continue;

    const filled = matchSlots(daySlots, postsByDate.get(date) ?? []);
    daySlots.forEach((slot, i) => {
      const isFilled = filled.has(i);
      result.push({
        key: `${slot.date}T${slot.time}`,
        date: slot.date,
        time: slot.time,
        at: slot.at,
        filled: isFilled,
        urgency: isFilled ? "none" : slotUrgency(slot.at, now),
      });
    });
  }
  return result;
}

/** Urgensi slot kosong relatif terhadap `now`. */
export function slotUrgency(slotAt: Date, now: Date): SlotUrgency {
  if (slotAt.getTime() < now.getTime()) return "overdue";
  return wibDaysBetween(now, slotAt) <= SLOT_WARNING_DAYS ? "soon" : "none";
}

/** Slot kosong yang belum lewat, dari hari ini (WIB) sampai `days` hari ke depan. */
export function upcomingEmptySlots(
  postingSlots: PostingSlot[],
  posts: SlotPost[],
  now: Date,
  days: number = UPCOMING_SLOT_DAYS,
): CalendarSlot[] {
  const today = startOfWibDay(now);
  const range = Array.from({ length: days }, (_, i) => addWibDays(today, i));
  return buildSlots(range, postingSlots, posts, now).filter(
    (s) => !s.filled && s.at.getTime() > now.getTime(),
  );
}

function groupPostsByDate(posts: SlotPost[]): Map<string, SlotPost[]> {
  const map = new Map<string, SlotPost[]>();
  for (const post of posts) {
    const date = toWibDateString(post.at);
    const list = map.get(date);
    if (list) list.push(post);
    else map.set(date, [post]);
  }
  return map;
}

/** Kembalikan indeks slot yang terisi. */
function matchSlots(slots: { at: Date }[], posts: SlotPost[]): Set<number> {
  const candidates: { slot: number; contentId: string; distance: number }[] = [];
  slots.forEach((slot, i) => {
    for (const post of posts) {
      const distance = Math.abs(post.at.getTime() - slot.at.getTime());
      if (distance <= SLOT_TOLERANCE_MS) candidates.push({ slot: i, contentId: post.contentId, distance });
    }
  });
  candidates.sort((a, b) => a.distance - b.distance || a.slot - b.slot);

  const filled = new Set<number>();
  const usedContents = new Set<string>();
  for (const c of candidates) {
    if (filled.has(c.slot) || usedContents.has(c.contentId)) continue;
    filled.add(c.slot);
    usedContents.add(c.contentId);
  }
  return filled;
}
