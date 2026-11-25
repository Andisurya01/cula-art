import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ReviewReminder } from "@/lib/analytics/review";
import { reviewReminderView } from "../derive";
import { cn } from "@/lib/utils";
import { HOME_ALERT } from "./row-styles";

/** E8: Minggu 18.00 WIB sampai review minggu itu tersimpan; Senin-Selasa untuk review minggu lalu. */
export function WeeklyReviewReminder({
  reminder,
  className,
}: {
  reminder: ReviewReminder | null;
  className?: string;
}) {
  if (!reminder) return null;
  const view = reviewReminderView(reminder);
  return (
    <Alert className={cn(HOME_ALERT, className)} data-kind={reminder.kind}>
      <NotebookPen />
      <AlertTitle>{view.title}</AlertTitle>
      <AlertDescription>
        <div>{view.description}</div>
        {/* AlertDescription menggarisbawahi semua tautan; tombol tidak perlu garis bawah. */}
        <Button asChild variant="outline" size="sm" className="mt-2 no-underline!">
          <Link href={view.href}>{view.actionLabel}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
