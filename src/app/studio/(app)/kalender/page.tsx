import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { CalendarBoard } from "@/features/calendar/components/calendar-board";
import { CalendarLegend, CalendarToolbar } from "@/features/calendar/components/calendar-toolbar";
import { getCalendarData } from "@/features/calendar/queries";
import { calendarDays, daysRange, parseCalendarParams } from "@/features/calendar/range";
import { getSettings } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Kalender" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const now = new Date();
  const params = parseCalendarParams(await searchParams, now);
  const days = calendarDays(params);
  const { start, end } = daysRange(days);

  const [settings, { posts, ready }] = await Promise.all([
    getSettings(),
    getCalendarData({ start, end, now }),
  ]);

  return (
    <>
      <PageHeader
        title="Kalender"
        description={
          settings.postingSlots.length === 0
            ? "Belum ada slot posting. Atur di Pengaturan."
            : `Target ${settings.weeklyPostTarget} post per minggu. Semua jam dalam WIB.`
        }
      />
      <CalendarToolbar params={params} />
      <CalendarLegend />
      <CalendarBoard
        view={params.view}
        date={params.date}
        days={days}
        now={now}
        postingSlots={settings.postingSlots}
        posts={posts}
        ready={ready}
      />
    </>
  );
}
