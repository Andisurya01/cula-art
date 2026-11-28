import { CalendarClock } from "lucide-react";
import type { Platform } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FOLLOWER_REMINDER_DAYS } from "@/lib/analytics/tasks";
import { AccountSnapshotButton, type LatestFollowers } from "@/features/metrics/components/account-snapshot-dialog";
import { platformList } from "../derive";
import { cn } from "@/lib/utils";
import { HOME_ALERT } from "./row-styles";

/** D8: platform yang belum punya snapshot followers dalam 7 hari terakhir. */
export function FollowerReminder({
  platforms,
  latest,
  className,
  style,
}: {
  platforms: readonly Platform[];
  latest: readonly LatestFollowers[];
  className?: string;
  /** Mis. `motionIndex(i)` untuk masuk berjeda (Fase 7). */
  style?: React.CSSProperties;
}) {
  if (platforms.length === 0) return null;
  return (
    <Alert className={cn(HOME_ALERT, className)} style={style}>
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
