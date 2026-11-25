import { ArrowLink } from "@/components/design/arrow-link";
import { SectionLabel } from "@/components/design/section-label";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { cn } from "@/lib/utils";

/** Lebar isi Galeri (maks. 1280 px) dengan gutter 16/24/40 px. */
export const galleryContainer = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

/** Jarak antarbagian halaman Galeri (banyak ruang kosong, gaya referensi). */
export const gallerySection = cn(galleryContainer, "pt-20 sm:pt-24 lg:pt-32");

/**
 * Kepala bagian Galeri: label kapital bernomor "• PILIHAN (01)", judul h2 dua warna, dan tautan pil
 * opsional (mis. "Lihat semua karya ↗"). `id` dipakai `aria-labelledby` di `<section>`.
 */
export function SectionHeading({
  id,
  index,
  eyebrow,
  title,
  second,
  action,
  className,
}: {
  id: string;
  /** Nomor bagian di halaman ("(01)"); dihitung halaman supaya tetap urut saat bagian kosong disembunyikan. */
  index?: number;
  eyebrow?: string;
  title: string;
  /** Baris kedua judul (warna abu). */
  second?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-10 grid gap-6 sm:mb-12 lg:gap-8", className)}>
      {(eyebrow || index !== undefined) && (
        <SectionLabel index={index} className="border-t border-border pt-4">
          {eyebrow}
        </SectionLabel>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <TwoToneHeading id={id} as="h2" level="h2" first={title} second={second} className="max-w-3xl" />
        {action && (
          <ArrowLink href={action.href} variant="secondary" size="lg">
            {action.label}
          </ArrowLink>
        )}
      </div>
    </div>
  );
}
