"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ExternalLink,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PillarBadge } from "@/components/pillar-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatWib } from "@/lib/date";
import { CONTENT_STAGE_LABELS, IDEA_STATUS_LABELS, MEDIUM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { setIdeaArchived } from "../actions";
import type { IdeaListItem } from "../queries";
import { ideaScore, MAX_IDEA_SCORE } from "../score";
import { ConvertIdeaDialog, type ConvertOptions } from "./convert-idea-dialog";
import { DeleteIdeaDialog } from "./delete-idea-dialog";
import { IdeaFormDialog } from "./idea-form-dialog";

type OpenDialog = "edit" | "convert" | "delete" | null;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function IdeaCard({ idea, options }: { idea: IdeaListItem; options: ConvertOptions }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [pending, startTransition] = useTransition();
  const score = ideaScore(idea.potential, idea.effort);
  const archived = idea.status === "ARCHIVED";
  const canConvert = !idea.content && !archived;
  const canDelete = !idea.content;

  function toggleArchive() {
    startTransition(async () => {
      const result = await callAction(() => setIdeaArchived({ id: idea.id, archived: !archived }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(archived ? "Ide dikembalikan" : "Ide diarsipkan");
      router.refresh();
    });
  }

  const dialogProps = (key: Exclude<OpenDialog, null>) => ({
    open: dialog === key,
    onOpenChange: (open: boolean) => setDialog(open ? key : null),
  });

  return (
    <Card className={cn("px-4", (archived || pending) && "opacity-70")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="leading-snug font-medium break-words">{idea.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {idea.pillar ? (
              <PillarBadge name={idea.pillar.name} color={idea.pillar.color} className="text-foreground" />
            ) : (
              <span>Tanpa pilar</span>
            )}
            {idea.medium && <span>{MEDIUM_LABELS[idea.medium]}</span>}
            <span>{formatWib(idea.createdAt, "d MMM yyyy")}</span>
          </div>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Aksi ide" className="-mt-1 -mr-2">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialog("edit")}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            {canConvert && (
              <DropdownMenuItem onSelect={() => setDialog("convert")}>
                <Sparkles />
                Jadikan Konten
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={toggleArchive} disabled={pending}>
              {archived ? <ArchiveRestore /> : <Archive />}
              {archived ? "Kembalikan" : "Arsipkan"}
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                  <Trash2 />
                  Hapus
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {idea.status !== "NEW" && (
          <Badge variant={archived ? "outline" : "secondary"}>{IDEA_STATUS_LABELS[idea.status]}</Badge>
        )}
        {score === null ? (
          <Badge variant="outline" className="text-muted-foreground">
            Belum dinilai
          </Badge>
        ) : (
          <Badge variant="outline" title={`Potensi ${idea.potential} × (6 − effort ${idea.effort})`}>
            Skor {score}/{MAX_IDEA_SCORE}
          </Badge>
        )}
        {(idea.potential !== null || idea.effort !== null) && (
          <span className="text-xs text-muted-foreground">
            Potensi {idea.potential ?? "–"} · Effort {idea.effort ?? "–"}
          </span>
        )}
      </div>

      {idea.notes && (
        <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">{idea.notes}</p>
      )}

      {idea.refUrl && (
        <a
          href={idea.refUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit max-w-full items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{hostnameOf(idea.refUrl)}</span>
        </a>
      )}

      {idea.content ? (
        <Button asChild variant="outline" size="sm" className="mt-auto w-full justify-between">
          <Link href={routes.studio.content(idea.content.id)}>
            Lihat konten · {CONTENT_STAGE_LABELS[idea.content.stage]}
            <ArrowRight />
          </Link>
        </Button>
      ) : (
        canConvert && (
          <Button
            type="button"
            size="sm"
            className="mt-auto w-full"
            onClick={() => setDialog("convert")}
          >
            <Sparkles />
            Jadikan Konten
          </Button>
        )
      )}

      <IdeaFormDialog idea={idea} pillars={options.pillars} {...dialogProps("edit")} />
      {canConvert && <ConvertIdeaDialog idea={idea} options={options} {...dialogProps("convert")} />}
      {canDelete && (
        <DeleteIdeaDialog ideaId={idea.id} title={idea.title} {...dialogProps("delete")} />
      )}
    </Card>
  );
}
