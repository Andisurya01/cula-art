import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskKind, TodayTask } from "@/lib/analytics/tasks";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { orderedPlatforms, TASK_KIND_LABELS, taskStageNote, taskTimeLabel } from "../derive";
import { ROW_LINK, ROW_LIST } from "./row-styles";

/** Warna dari token status; badge selalu berlabel, jadi jenis tugas tidak hanya dibedakan warna. */
const KIND_BADGE: Record<TaskKind, React.ComponentProps<typeof Badge>["variant"]> = {
  OVERDUE: "destructive",
  TODAY: "outline",
  NOT_READY: "warning",
};

/** Tugas hari ini (D7): lewat jadwal, terjadwal hari ini, dan konten terjadwal yang belum siap. */
export function TodayTasksCard({
  tasks,
  now,
  className,
}: {
  tasks: readonly TodayTask[];
  now: Date;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="size-4 text-muted-foreground" aria-hidden />
          Tugas hari ini
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada post yang perlu dikerjakan hari ini.</p>
        ) : (
          <ul className={ROW_LIST}>
            {tasks.map((task) => {
              const stageNote = taskStageNote(task);
              return (
                <li key={`${task.contentId}:${task.kind}`}>
                  <Link href={routes.studio.content(task.contentId)} className={cn("block", ROW_LINK)}>
                    <span className="block truncate font-medium">{task.title}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                      <Badge variant={KIND_BADGE[task.kind]} className={cn(task.kind === "TODAY" && "bg-card")}>
                        {TASK_KIND_LABELS[task.kind]}
                      </Badge>
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
