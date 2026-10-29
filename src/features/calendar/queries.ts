import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addWibDays, startOfWibDay } from "@/lib/date";
import type { CalendarPost, ReadyContent } from "./schedule";
import { UPCOMING_SLOT_DAYS } from "./slots";

const postSelect = {
  id: true,
  contentId: true,
  platform: true,
  scheduledAt: true,
  postedAt: true,
  content: { select: { title: true, pillar: { select: { name: true, color: true } } } },
} satisfies Prisma.PostSelect;

/** Post yang waktunya (postedAt jika sudah posting, selain itu scheduledAt) jatuh di `[start, end)`. */
async function postsInRange(start: Date, end: Date): Promise<CalendarPost[]> {
  const rows = await db.post.findMany({
    where: {
      OR: [
        { postedAt: { gte: start, lt: end } },
        { postedAt: null, scheduledAt: { gte: start, lt: end } },
      ],
    },
    select: postSelect,
  });
  return rows.flatMap((row): CalendarPost[] => {
    const at = row.postedAt ?? row.scheduledAt;
    if (!at) return [];
    return [
      {
        id: row.id,
        contentId: row.contentId,
        title: row.content.title,
        platform: row.platform,
        pillarName: row.content.pillar.name,
        pillarColor: row.content.pillar.color,
        at,
        posted: row.postedAt !== null,
      },
    ];
  });
}

/**
 * Data halaman Kalender: post di rentang tampilan + post 14 hari ke depan (untuk menghitung
 * slot kosong di dialog Jadwalkan), digabung tanpa duplikat, dan konten stage READY.
 */
export async function getCalendarData({ start, end, now }: { start: Date; end: Date; now: Date }) {
  const today = startOfWibDay(now);
  const [viewPosts, upcomingPosts, readyRows] = await Promise.all([
    postsInRange(start, end),
    postsInRange(today, addWibDays(today, UPCOMING_SLOT_DAYS + 1)),
    db.content.findMany({
      where: { stage: "READY" },
      orderBy: { stageChangedAt: "asc" },
      select: {
        id: true,
        title: true,
        pillar: { select: { name: true, color: true } },
        posts: { select: { platform: true, scheduledAt: true, postedAt: true } },
      },
    }),
  ]);

  const byId = new Map<string, CalendarPost>();
  for (const post of [...viewPosts, ...upcomingPosts]) byId.set(post.id, post);
  const posts = [...byId.values()].sort((a, b) => a.at.getTime() - b.at.getTime());

  const ready: ReadyContent[] = readyRows.map((row) => ({
    id: row.id,
    title: row.title,
    pillarName: row.pillar.name,
    pillarColor: row.pillar.color,
    versions: row.posts,
  }));

  return { posts, ready };
}
