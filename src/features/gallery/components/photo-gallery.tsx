"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { motionLevelOf } from "@/components/motion/use-motion-level";
import { SharedElement } from "@/components/motion/view-transitions";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryImage } from "../dto";
import { Lightbox, lightboxOriginOf } from "./lightbox";
import type { LightboxOrigin } from "./lightbox-origin";

/** Lebar foto utama: selebar layar di HP; ±7/12 kontainer (maks. 1280 px) di desktop. */
const MAIN_SIZES = "(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 100vw";

/** Rasio bingkai mengikuti cover, dibatasi 3:4 sampai 4:3 supaya foto lain tidak terlalu terpotong ruangnya. */
function frameRatio(cover: GalleryImage): number {
  const ratio = cover.width / Math.max(1, cover.height);
  return Math.min(4 / 3, Math.max(3 / 4, ratio));
}

/** Lightbox: foto yang dibuka (null = tertutup) dan asal zoom buka/tutup (Fase 7). */
type LightboxState = { index: number | null; origin: LightboxOrigin | null };
const CLOSED: LightboxState = { index: null, origin: null };

const arrowButton =
  "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-card-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition-opacity outline-hidden hover:bg-card focus-visible:ring-3 focus-visible:ring-ring md:inline-flex disabled:opacity-0";

/**
 * Foto karya: geser (scroll-snap) di HP, panah + thumbnail di desktop. Ketuk foto → layar penuh + zoom.
 * Foto pertama adalah kandidat LCP, jadi di-preload; sisanya lazy.
 * Fase 7: bingkai foto = elemen bersama dari kartu katalog (`transitionName`, A8); layar penuh
 * membuka dari foto yang diketuk dan menutup ke foto yang sedang tampil.
 */
export function PhotoGallery({
  images,
  title,
  transitionName,
}: {
  images: GalleryImage[];
  title: string;
  /** Nama View Transition foto utama (`artworkPhotoTransitionName(slug)`), sama dengan kartu katalog. */
  transitionName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<LightboxState>(CLOSED);
  const total = images.length;

  if (total === 0) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-image bg-muted text-muted-foreground">
        <ImageOff className="size-8" aria-hidden="true" />
        <p className="text-body-sm">{galleryCopy.detail.noPhotos}</p>
      </div>
    );
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }

  function goTo(i: number, behavior?: ScrollBehavior) {
    const el = scrollerRef.current;
    // Gulir halus kecuali animasi Mati / "kurangi gerakan" (tingkat dari <html data-motion>).
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: behavior ?? (motionLevelOf(el) === "off" ? "auto" : "smooth") });
    setActive(i);
  }

  const ratio = frameRatio(images[0]);

  const scroller = (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      role="region"
      aria-label={title}
      className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-image bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {images.map((image, i) => (
        <button
          key={image.src}
          type="button"
          onClick={(event) => setLightbox({ index: i, origin: lightboxOriginOf(event.currentTarget) })}
          className="relative max-h-[80svh] w-full shrink-0 cursor-zoom-in snap-center outline-hidden focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
          style={{ aspectRatio: String(ratio) }}
        >
          <span className="sr-only">{galleryCopy.detail.openPhoto(i + 1, total)}</span>
          <Image src={image.src} alt={image.alt} fill sizes={MAIN_SIZES} preload={i === 0} className="object-contain" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="relative">
        {transitionName ? <SharedElement name={transitionName}>{scroller}</SharedElement> : scroller}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              className={cn(arrowButton, "left-3")}
              aria-label={galleryCopy.detail.prevPhoto}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(total - 1, active + 1))}
              disabled={active === total - 1}
              className={cn(arrowButton, "right-3")}
              aria-label={galleryCopy.detail.nextPhoto}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <p
              aria-hidden="true"
              className="pointer-events-none absolute right-3 bottom-3 rounded-badge bg-media/70 px-2.5 py-1 text-caption font-medium text-media-foreground tabular-nums backdrop-blur md:hidden"
            >
              {galleryCopy.lightbox.counter(active + 1, total)}
            </p>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="hidden flex-wrap gap-2 md:flex" aria-label={galleryCopy.detail.thumbnails}>
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={galleryCopy.detail.photoLabel(i + 1, total)}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-card-nested bg-muted ring-offset-2 ring-offset-background transition-opacity outline-hidden focus-visible:ring-3 focus-visible:ring-ring lg:size-20",
                  i === active ? "ring-2 ring-foreground" : "opacity-60 hover:opacity-100",
                )}
              >
                <Image src={image.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        images={images}
        index={lightbox.index}
        origin={lightbox.origin}
        title={title}
        // Menutup ke foto yang sedang tampil di bingkai (sudah disamakan lewat onIndexChange).
        onClose={() => setLightbox({ index: null, origin: lightboxOriginOf(scrollerRef.current) })}
        onIndexChange={(i) => {
          setLightbox((current) => ({ ...current, index: i }));
          goTo(i, "auto");
        }}
      />
    </div>
  );
}

/**
 * Foto proses: grid kotak kecil; ketuk → layar penuh (zoom dari kotak yang diketuk, menutup ke kotak
 * foto yang sedang tampil). Fase 7: kotak muncul berjeda saat di-scroll, hover/fokus membesar halus.
 */
export function PhotoGrid({ images, title }: { images: GalleryImage[]; title: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [lightbox, setLightbox] = useState<LightboxState>(CLOSED);
  const total = images.length;
  if (total === 0) return null;

  /** Tombol foto ke-`index` (untuk asal zoom saat menutup). */
  function photoButton(index: number | null): HTMLButtonElement | null {
    if (index === null) return null;
    return listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-photo]")[index] ?? null;
  }

  return (
    <>
      <ul ref={listRef} className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {images.map((image, i) => (
          <Reveal as="li" key={image.src}>
            <button
              type="button"
              data-photo=""
              onClick={(event) => setLightbox({ index: i, origin: lightboxOriginOf(event.currentTarget) })}
              className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-image bg-muted outline-hidden focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="sr-only">{galleryCopy.detail.openPhoto(i + 1, total)}</span>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1280px) 400px, (min-width: 640px) 31vw, 48vw"
                className="object-cover transition-transform duration-slow ease-standard group-hover:motion-zoom group-focus-visible:motion-zoom"
              />
            </button>
          </Reveal>
        ))}
      </ul>
      <Lightbox
        images={images}
        index={lightbox.index}
        origin={lightbox.origin}
        title={title}
        onClose={() => setLightbox({ index: null, origin: lightboxOriginOf(photoButton(lightbox.index)) })}
        onIndexChange={(i) => setLightbox((current) => ({ ...current, index: i }))}
      />
    </>
  );
}
