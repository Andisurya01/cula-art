import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ImageIcon, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceIdr } from "@/features/gallery/format";
import { AVAILABILITY_LABELS, MEDIUM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { ArtworkListItem } from "../queries";
import { VisibilityBadge } from "./visibility-badge";

/** Kartu karya di daftar Studio: cover 4:5, status, medium · tahun, ketersediaan, harga. */
export function ArtworkCard({ artwork }: { artwork: ArtworkListItem }) {
  const meta = [artwork.medium ? MEDIUM_LABELS[artwork.medium] : null, artwork.year].filter(Boolean).join(" · ");

  return (
    <Link
      href={routes.studio.artwork(artwork.id)}
      className="group block overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/5] bg-muted">
        {artwork.cover ? (
          <Image
            src={routes.media(artwork.cover.storageKey)}
            alt={artwork.cover.alt || artwork.title}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" aria-hidden />
            <span className="sr-only">Belum ada foto</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <VisibilityBadge visibility={artwork.visibility} />
          {artwork.isFeatured && (
            <Badge variant="secondary" title={`Unggulan, urutan ${artwork.featuredOrder}`}>
              <Star aria-hidden />
              Unggulan
            </Badge>
          )}
        </div>
      </div>
      <div className="grid gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium break-words">{artwork.title}</p>
        <p className="text-xs text-muted-foreground">{meta || "Medium & tahun belum diisi"}</p>
        <p className="text-xs">
          {AVAILABILITY_LABELS[artwork.availability]}
          {artwork.priceIdr !== null && artwork.availability !== "NOT_FOR_SALE" && (
            <span className="text-muted-foreground">
              {" · "}
              {formatPriceIdr(artwork.priceIdr)}
              {!artwork.showPrice && " (disembunyikan)"}
            </span>
          )}
        </p>
        {artwork.visibility !== "PUBLISHED" && artwork.problemCount > 0 && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {artwork.problemCount} syarat terbit belum terpenuhi
          </p>
        )}
      </div>
    </Link>
  );
}
