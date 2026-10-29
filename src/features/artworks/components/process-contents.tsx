"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContentStage, Platform } from "@prisma/client";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import { CONTENT_STAGE_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { setArtworkContents } from "../actions";
import { MAX_ARTWORK_CONTENTS } from "../schema";

type PostLink = { platform: Platform; url: string | null; postedAt: Date | null };

export type ProcessContent = { id: string; title: string; stage: ContentStage; posts: PostLink[] };

export type PostedContentChoice = { id: string; title: string; stageChangedAt: Date; posts: PostLink[] };

/** Video proses: konten Posted yang tautan post TikTok/Instagram-nya tampil di Galeri. */
export function ProcessContents({
  artworkId,
  selected,
  options,
}: {
  artworkId: string;
  selected: ProcessContent[];
  options: PostedContentChoice[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(selected);
  const [serverItems, setServerItems] = useState(selected);
  if (selected !== serverItems) {
    setServerItems(selected);
    setItems(selected);
  }
  const [pending, startTransition] = useTransition();

  function save(next: ProcessContent[], success: string) {
    setItems(next);
    startTransition(async () => {
      const result = await callAction(() =>
        setArtworkContents({ artworkId, contentIds: next.map((c) => c.id) }),
      );
      if (!result.ok) {
        toast.error(result.error);
        setItems(selected);
      } else {
        toast.success(success);
      }
      router.refresh();
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    save(next, "Urutan video proses disimpan");
  }

  const selectedIds = new Set(items.map((c) => c.id));
  const available = options.filter((o) => !selectedIds.has(o.id));
  const full = items.length >= MAX_ARTWORK_CONTENTS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video proses</CardTitle>
        <CardDescription>
          Pilih konten berstatus Posted. Galeri menampilkan tautan ke post TikTok/Instagram-nya (tanpa embed).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length > 0 ? (
          <ol className="grid gap-2" aria-label="Video proses terpilih">
            {items.map((content, index) => (
              <li key={content.id} className="grid gap-2 rounded-lg border p-2.5">
                <div className="flex items-start gap-2">
                  <Link
                    href={routes.studio.content(content.id)}
                    className="min-w-0 flex-1 text-sm font-medium break-words hover:underline"
                  >
                    {content.title}
                  </Link>
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Naikkan ${content.title}`}
                      title="Naikkan"
                      disabled={pending || index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Turunkan ${content.title}`}
                      title="Turunkan"
                      disabled={pending || index === items.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Lepas ${content.title} dari video proses`}
                      title="Lepas"
                      disabled={pending}
                      onClick={() =>
                        save(
                          items.filter((c) => c.id !== content.id),
                          "Video proses dilepas",
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                </div>
                <PostLinks posts={content.posts} />
                {content.stage !== "POSTED" && (
                  <p className="text-xs text-muted-foreground">
                    Stage konten sekarang {CONTENT_STAGE_LABELS[content.stage]}; tautan hanya tampil untuk post yang
                    sudah diposting.
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Belum ada video proses (opsional).
          </p>
        )}

        <PickContentDialog
          options={available}
          disabled={pending || full}
          onPick={(choice) =>
            save(
              [...items, { id: choice.id, title: choice.title, stage: "POSTED", posts: choice.posts }],
              "Video proses ditambahkan",
            )
          }
        />
        {full && (
          <p className="text-xs text-muted-foreground">Maksimal {MAX_ARTWORK_CONTENTS} video proses per karya.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PostLinks({ posts }: { posts: PostLink[] }) {
  const links = posts.filter((p): p is PostLink & { url: string } => !!p.url);
  if (links.length === 0) {
    return <p className="text-xs text-muted-foreground">Belum ada tautan post.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {links.map((post) => (
        <li key={post.platform} className="min-w-0 max-w-full">
          <Badge variant="outline" asChild className="h-auto max-w-full py-1">
            <a href={post.url} target="_blank" rel="noopener noreferrer" title={post.url}>
              <ExternalLink aria-hidden />
              <span className="shrink-0">{PLATFORM_LABELS[post.platform]}</span>
              <span className="min-w-0 truncate font-normal text-muted-foreground">
                {post.url.replace(/^https?:\/\/(www\.)?/, "")}
              </span>
            </a>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function PickContentDialog({
  options,
  disabled,
  onPick,
}: {
  options: PostedContentChoice[];
  disabled: boolean;
  onPick: (choice: PostedContentChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.title.toLowerCase().includes(q)) : options;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="justify-self-start">
          <Plus />
          Pilih konten Posted
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] grid-rows-[auto_auto_1fr] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih video proses</DialogTitle>
          <DialogDescription>Hanya konten berstatus Posted yang bisa dipilih.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul konten"
            aria-label="Cari judul konten"
            className="pl-8"
          />
        </div>
        <div className="min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Video className="size-6" aria-hidden />
              {options.length === 0
                ? "Belum ada konten Posted lain yang bisa dipilih."
                : "Tidak ada konten yang cocok."}
            </div>
          ) : (
            <ul className="grid gap-2">
              {filtered.map((option) => (
                <li key={option.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <p className="text-sm font-medium break-words">{option.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.posts.length > 0
                        ? option.posts.map((p) => PLATFORM_LABELS[p.platform]).join(" · ")
                        : "Belum ada tautan post"}
                      {" · Posted "}
                      {formatWib(option.stageChangedAt, "d MMM yyyy")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onPick(option);
                      setOpen(false);
                    }}
                  >
                    Pilih
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
