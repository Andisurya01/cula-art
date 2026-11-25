"use client";

import { useState } from "react";
import type { Platform } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MetricStatusBadge } from "@/features/metrics/components/metric-status-badge";
import type { ExperimentVariant } from "@/lib/analytics/experiments";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { searchCandidates, type PostCandidate } from "../derive";
import { useExperimentPost } from "./use-experiment-post";

const RESULT_LIMIT = 50;

/**
 * Pilih post tayang untuk satu varian: hanya platform eksperimen, terbaru dulu, cari judul.
 * Post di varian lain bisa dipindah dari sini (satu post satu varian). Dialog tetap terbuka supaya
 * beberapa post bisa ditambahkan sekaligus.
 */
export function PostPickerDialog({
  experimentId,
  variant,
  platform,
  candidates,
}: {
  experimentId: string;
  variant: ExperimentVariant;
  platform: Platform;
  candidates: readonly PostCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { pending, assign } = useExperimentPost(experimentId);
  const { items, total } = searchCandidates(candidates, query, RESULT_LIMIT);
  const platformLabel = PLATFORM_LABELS[platform];
  const searchId = `picker-${experimentId}-${variant}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus />
          Tambah post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post untuk varian {variant}</DialogTitle>
          <DialogDescription>
            Hanya post yang sudah tayang di {platformLabel}. Satu post hanya bisa masuk satu varian.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor={searchId} className="sr-only">
            Cari judul post
          </label>
          <Input
            id={searchId}
            type="search"
            autoComplete="off"
            placeholder="Cari judul…"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="-mx-4 max-h-[55svh] overflow-y-auto px-4">
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada post yang tayang di {platformLabel}. Post muncul di sini setelah kontennya tayang
              (Pipeline → Posted, dengan waktu posting).
            </p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada judul yang cocok.</p>
          ) : (
            <ul className="divide-y">
              {items.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  variant={variant}
                  pending={pending}
                  onAssign={() => assign(candidate.id, variant)}
                />
              ))}
            </ul>
          )}
          {total > items.length && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Menampilkan {items.length} dari {total} post. Ketik judul untuk mempersempit.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  candidate,
  variant,
  pending,
  onAssign,
}: {
  candidate: PostCandidate;
  variant: ExperimentVariant;
  pending: boolean;
  onAssign: () => void;
}) {
  const here = candidate.variant === variant;
  const other = candidate.variant !== null && !here;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium [overflow-wrap:anywhere]">{candidate.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <MetricStatusBadge status={candidate.status} />
          <span>{formatWib(candidate.postedAt, "d MMM yyyy, HH.mm")} WIB</span>
          {other && <span>Di varian {candidate.variant}</span>}
        </div>
      </div>
      {here ? (
        <span className="shrink-0 text-xs text-muted-foreground">Sudah di {variant}</span>
      ) : (
        <Button
          type="button"
          size="sm"
          variant={other ? "outline" : "secondary"}
          className="shrink-0"
          disabled={pending}
          onClick={onAssign}
          aria-label={`${other ? "Pindah" : "Tambah"} “${candidate.title}” ke varian ${variant}`}
        >
          {other ? `Pindah ke ${variant}` : "Tambah"}
        </Button>
      )}
    </li>
  );
}
