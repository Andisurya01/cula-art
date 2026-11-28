import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SharedElement, artworkPhotoTransitionName } from "@/components/motion/view-transitions";
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
  /**
   * Foto kartu "melebar" menjadi foto utama detail saat dibuka (A8, View Transitions). Hanya untuk
   * grid yang memuat setiap karya sekali (katalog): nama transisi ganda di satu halaman (mis. karya
   * yang sama di Unggulan dan Terbaru Beranda) membatalkan transisi.
   */
  sharedTransition?: boolean;
  className?: string;
};

/**
 * Kartu produk: cover 4:5 dengan radius gambar token, badge ketersediaan di foto, judul, medium ·
 * tahun, dan harga. Seluruh kartu bisa diketuk (tautan judul direntangkan ke seluruh kartu).
 * Fase 7: muncul saat di-scroll (berjeda otomatis di grid), foto membesar halus dan ikon ↗
 * bergeser saat hover/fokus (nilai dari token tingkat animasi; diam saat Mati/kurangi gerakan).
 */
export function ArtworkCard({
  artwork,
  sizes,
  headingLevel = "h3",
  loading = "lazy",
  sharedTransition = false,
  className,
}: ArtworkCardProps) {
  const Heading = headingLevel;
  const price = priceLabel(artwork);
  const meta = artworkMeta(artwork);
  const href = routes.gallery.artwork(artwork.slug);

  // Bingkai foto sendiri (tanpa badge/ikon) supaya hanya foto yang ikut transisi elemen bersama.
  const frame = (
    <div className="relative aspect-[4/5] overflow-hidden rounded-image bg-muted">
      {artwork.cover ? (
        <Image
          src={artwork.cover.src}
          alt={artwork.cover.alt}
          fill
          sizes={sizes}
          loading={loading === "lazy" ? "lazy" : "eager"}
          fetchPriority={loading === "high" ? "high" : undefined}
          className="object-cover transition-transform duration-slow ease-standard group-focus-within:motion-zoom group-hover:motion-zoom"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="size-6" aria-hidden="true" />
          <span className="text-caption">{galleryCopy.card.noPhoto}</span>
        </div>
      )}
    </div>
  );

  return (
    <Reveal as="article" className={cn("group relative", className)}>
      <div className="relative">
        {sharedTransition ? <SharedElement name={artworkPhotoTransitionName(artwork.slug)}>{frame}</SharedElement> : frame}
        <AvailabilityBadge availability={artwork.availability} overlay className="absolute top-3 left-3" />
        {/* Ikon ↗ hiasan (tautan sudah dibaca lewat judul): pil gelap palet media, kontras di kedua mode. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 bottom-3 hidden size-9 items-center justify-center rounded-full bg-media/75 text-media-foreground backdrop-blur-sm sm:inline-flex"
        >
          <ArrowUpRight className="size-4 transition-transform duration-base ease-standard group-focus-within:motion-nudge group-hover:motion-nudge" />
        </span>
      </div>
      <div className="mt-4 grid gap-1 px-1">
        <Heading className="font-heading text-h5 text-pretty wrap-break-word">
          <Link
            href={href}
            className="rounded-image outline-hidden after:absolute after:inset-0 after:rounded-image focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
          >
            {artwork.title}
          </Link>
        </Heading>
        {meta && <p className="text-body-sm text-muted-foreground">{meta}</p>}
        {price && <p className="text-body-sm font-medium">{price}</p>}
      </div>
    </Reveal>
  );
}
