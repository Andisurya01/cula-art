import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryArtworkCard } from "../dto";
import { artworkMeta, priceLabel } from "../format";
import { AvailabilityBadge } from "./availability-badge";

/** `sizes` untuk tiap tata letak grid (lebar kontainer maks. 1280 px, padding 40 px). */
export const CARD_SIZES = {
  /** 2 kolom HP, 3 tablet, 4 desktop. */
  catalog: "(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 48vw",
  /** 2 kolom HP, 3 kolom tablet ke atas. */
  three: "(min-width: 1280px) 390px, (min-width: 768px) 31vw, 48vw",
  /** Baris geser di HP (±72vw), 3-4 kolom di layar lebar. */
  row: "(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 72vw",
  /** 2 kolom HP, 4 kolom desktop. */
  four: "(min-width: 1280px) 290px, (min-width: 1024px) 23vw, 48vw",
} as const;

export type ArtworkCardProps = {
  artwork: GalleryArtworkCard;
  sizes: string;
  /** Level judul kartu, supaya urutan heading halaman tetap berurutan. */
  headingLevel?: "h2" | "h3";
  /** Kartu di layar pertama: muat segera (bukan lazy). `high` untuk kandidat LCP. */
  loading?: "lazy" | "eager" | "high";
  className?: string;
};

/** Kartu produk: cover 4:5, judul, medium · tahun, badge ketersediaan, harga. Seluruh kartu bisa diketuk. */
export function ArtworkCard({ artwork, sizes, headingLevel = "h3", loading = "lazy", className }: ArtworkCardProps) {
  const Heading = headingLevel;
  const price = priceLabel(artwork);
  const meta = artworkMeta(artwork);
  const href = routes.gallery.artwork(artwork.slug);

  return (
    <article className={cn("group relative", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted">
        {artwork.cover ? (
          <Image
            src={artwork.cover.src}
            alt={artwork.cover.alt}
            fill
            sizes={sizes}
            loading={loading === "lazy" ? "lazy" : "eager"}
            fetchPriority={loading === "high" ? "high" : undefined}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-xs">{galleryCopy.card.noPhoto}</span>
          </div>
        )}
        <AvailabilityBadge availability={artwork.availability} overlay className="absolute top-2.5 left-2.5" />
      </div>
      <div className="mt-3 grid gap-1">
        <Heading className="font-display text-lg leading-snug tracking-tight text-pretty">
          <Link
            href={href}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
          >
            {artwork.title}
          </Link>
        </Heading>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        {price && <p className="text-sm font-medium">{price}</p>}
      </div>
    </article>
  );
}
