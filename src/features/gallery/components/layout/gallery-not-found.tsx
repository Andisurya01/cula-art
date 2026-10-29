import Link from "next/link";
import { routes } from "@/lib/routes";
import { galleryCopy } from "../../copy";

/** Isi halaman 404 Galeri (karya tidak ada / belum terbit / URL salah). */
export function GalleryNotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-6 px-4 py-24 sm:px-6 md:py-32">
      <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">404</p>
      <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">{galleryCopy.notFound.title}</h1>
      <p className="max-w-prose text-muted-foreground">{galleryCopy.notFound.description}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={routes.gallery.catalog}
          className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm text-background transition-opacity hover:opacity-90"
        >
          {galleryCopy.notFound.backToCatalog}
        </Link>
        <Link
          href={routes.gallery.home}
          className="inline-flex h-11 items-center rounded-full border px-6 text-sm transition-colors hover:bg-muted"
        >
          {galleryCopy.notFound.backHome}
        </Link>
      </div>
    </section>
  );
}
