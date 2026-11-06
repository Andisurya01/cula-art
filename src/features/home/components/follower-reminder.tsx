import { CalendarClock } from "lucide-react";
import type { Platform } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FOLLOWER_REMINDER_DAYS } from "@/lib/analytics/tasks";
import { AccountSnapshotButton, type LatestFollowers } from "@/features/metrics/components/account-snapshot-dialog";
import { platformList } from "../derive";

/** D8: platform yang belum punya snapshot followers dalam 7 hari terakhir. */
export function FollowerReminder({
  platforms,
  latest,
  className,
}: {
  platforms: readonly Platform[];
  latest: readonly LatestFollowers[];
  className?: string;
}) {
  if (platforms.length === 0) return null;
  return (
    <Alert className={className}>
      <CalendarClock />
      <AlertTitle>Saatnya mencatat followers</AlertTitle>
      <AlertDescription>
        <div>
          {platformList(platforms)} belum punya snapshot followers dalam {FOLLOWER_REMINDER_DAYS} hari terakhir.
        </div>
        <AccountSnapshotButton latest={latest} className="mt-2">
          Isi snapshot followers
        </AccountSnapshotButton>
      </AlertDescription>
    </Alert>
  );
}
