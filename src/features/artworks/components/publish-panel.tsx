"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArtworkVisibility } from "@prisma/client";
import { Archive, CheckCircle2, Circle, ExternalLink, Eye, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import { routes } from "@/lib/routes";
import { setArtworkVisibility } from "../actions";
import { PUBLISH_REQUIREMENT_LABELS, type PublishProblem, type PublishRequirement } from "../rules";
import { VisibilityBadge } from "./visibility-badge";

const REQUIREMENTS = Object.keys(PUBLISH_REQUIREMENT_LABELS) as PublishRequirement[];

const SUCCESS: Record<ArtworkVisibility, string> = {
  PUBLISHED: "Karya terbit di Galeri",
  DRAFT: "Karya dikembalikan ke Draft",
  ARCHIVED: "Karya diarsipkan",
};

/** Status publikasi + syarat terbit (dicek ulang di server) + tombol Terbitkan / Draft / Arsipkan. */
export function PublishPanel({
  artworkId,
  slug,
  visibility,
  publishedAt,
  problems,
}: {
  artworkId: string;
  slug: string;
  visibility: ArtworkVisibility;
  publishedAt: Date | null;
  problems: PublishProblem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unmet = new Map(problems.map((p) => [p.key, p.message]));
  const ready = problems.length === 0;

  function change(next: ArtworkVisibility) {
    startTransition(async () => {
      const result = await callAction(() => setArtworkVisibility({ id: artworkId, visibility: next }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(SUCCESS[next]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Publikasi <VisibilityBadge visibility={visibility} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          {visibility === "PUBLISHED"
            ? "Tampil di Galeri."
            : visibility === "ARCHIVED"
              ? "Diarsipkan: tidak tampil di Galeri."
              : "Draft: belum tampil di Galeri."}
          {publishedAt && ` Pertama terbit ${formatWib(publishedAt, "d MMM yyyy, HH.mm")} WIB.`}
        </p>

        <div className="grid gap-1.5">
          <p className="text-sm font-medium">{ready ? "Semua syarat terbit terpenuhi" : "Syarat terbit"}</p>
          <ul className="grid gap-1 text-sm">
            {REQUIREMENTS.map((key) => {
              const message = unmet.get(key);
              return (
                <li key={key} className="flex items-start gap-2">
                  {message ? (
                    <Circle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  )}
                  <span className={message ? "" : "text-muted-foreground"}>
                    {PUBLISH_REQUIREMENT_LABELS[key]}
                    <span className="sr-only">{message ? ": belum" : ": sudah"}</span>
                    {message && <span className="block text-xs text-destructive">{message}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-2">
          {visibility !== "PUBLISHED" && (
            <Button type="button" disabled={pending || !ready} onClick={() => change("PUBLISHED")}>
              <Send />
              Terbitkan
            </Button>
          )}
          {visibility !== "DRAFT" && (
            <Button type="button" variant="outline" disabled={pending} onClick={() => change("DRAFT")}>
              <Undo2 />
              Kembalikan ke Draft
            </Button>
          )}
          {visibility !== "ARCHIVED" && (
            <Button type="button" variant="outline" disabled={pending} onClick={() => change("ARCHIVED")}>
              <Archive />
              Arsipkan
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={routes.studio.artworkPreview(artworkId)}>
              <Eye />
              Pratinjau
            </Link>
          </Button>
          {visibility === "PUBLISHED" && (
            <Button asChild variant="ghost">
              <a href={routes.gallery.artwork(slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Lihat di Galeri
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
