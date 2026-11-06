import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskKind, TodayTask } from "@/lib/analytics/tasks";
import { routes } from "@/lib/routes";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { orderedPlatforms, TASK_KIND_LABELS, taskStageNote, taskTimeLabel } from "../derive";

const KIND_BADGE: Record<TaskKind, React.ComponentProps<typeof Badge>> = {
  OVERDUE: { variant: "destructive" },
  TODAY: { variant: "secondary" },
  NOT_READY: {
    variant: "outline",
    className: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  },
};

/** Tugas hari ini (D7): lewat jadwal, terjadwal hari ini, dan konten terjadwal yang belum siap. */
export function TodayTasksCard({ tasks, now }: { tasks: readonly TodayTask[]; now: Date }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tugas hari ini</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada post yang perlu dikerjakan hari ini.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tasks.map((task) => {
              const stageNote = taskStageNote(task);
              return (
                <li key={`${task.contentId}:${task.kind}`}>
                  <Link
                    href={routes.studio.content(task.contentId)}
                    className="block px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="block truncate font-medium">{task.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge {...KIND_BADGE[task.kind]}>{TASK_KIND_LABELS[task.kind]}</Badge>
                      {stageNote && <span>{stageNote}</span>}
                      <span>{taskTimeLabel(task.at, now)}</span>
                      {orderedPlatforms(task.platforms).map((platform) => (
                        <PlatformBadge key={platform} platform={platform} />
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
