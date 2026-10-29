"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryImage } from "../dto";
import { Lightbox } from "./lightbox";

/** Lebar foto utama: penuh di HP; ±7/12 kontainer (maks. 1280 px) di desktop. */
const MAIN_SIZES = "(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 100vw";

/** Rasio bingkai mengikuti cover, dibatasi 3:4 sampai 4:3 supaya foto lain tidak terlalu terpotong ruangnya. */
function frameRatio(cover: GalleryImage): number {
  const ratio = cover.width / Math.max(1, cover.height);
  return Math.min(4 / 3, Math.max(3 / 4, ratio));
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const arrowButton =
  "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-opacity hover:bg-background md:inline-flex disabled:opacity-0";

/**
 * Foto karya: geser (scroll-snap) di HP, panah + thumbnail di desktop. Ketuk foto → layar penuh + zoom.
 * Foto pertama adalah kandidat LCP, jadi di-preload; sisanya lazy.
 */
export function PhotoGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const total = images.length;

  if (total === 0) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-muted text-muted-foreground lg:rounded-sm">
        <ImageOff className="size-8" aria-hidden="true" />
        <p className="text-sm">{galleryCopy.detail.noPhotos}</p>
      </div>
    );
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }

  function goTo(i: number, behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth") {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior });
    setActive(i);
  }

  const ratio = frameRatio(images[0]);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          role="region"
          aria-label={title}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] lg:rounded-sm [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative max-h-[80svh] w-full shrink-0 cursor-zoom-in snap-center bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              style={{ aspectRatio: String(ratio) }}
            >
              <span className="sr-only">{galleryCopy.detail.openPhoto(i + 1, total)}</span>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={MAIN_SIZES}
                preload={i === 0}
                className="object-contain"
              />
            </button>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              className={cn(arrowButton, "left-3")}
              aria-label={galleryCopy.detail.prevPhoto}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(total - 1, active + 1))}
              disabled={active === total - 1}
              className={cn(arrowButton, "right-3")}
              aria-label={galleryCopy.detail.nextPhoto}
            >
              <ChevronRight className="size-5" />
            </button>
            <p
              aria-hidden="true"
              className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur md:hidden"
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
                  "relative block size-16 overflow-hidden rounded-sm bg-muted ring-offset-2 ring-offset-background transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring lg:size-20",
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
        index={lightbox}
        title={title}
        onClose={() => setLightbox(null)}
        onIndexChange={(i) => {
          setLightbox(i);
          goTo(i, "auto");
        }}
      />
    </div>
  );
}

/** Foto proses: grid kotak kecil; ketuk → layar penuh. */
export function PhotoGrid({ images, title }: { images: GalleryImage[]; title: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const total = images.length;
  if (total === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {images.map((image, i) => (
          <li key={image.src}>
            <button
              type="button"
              onClick={() => setLightbox(i)}
              className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-sm bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="sr-only">{galleryCopy.detail.openPhoto(i + 1, total)}</span>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1280px) 400px, (min-width: 640px) 31vw, 48vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>
      <Lightbox images={images} index={lightbox} title={title} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
    </>
  );
}
