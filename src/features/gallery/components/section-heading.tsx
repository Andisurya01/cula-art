import { ArrowLink } from "@/components/design/arrow-link";
import { SectionLabel } from "@/components/design/section-label";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/** Lebar isi Galeri (maks. 1280 px) dengan gutter 16/24/40 px. */
export const galleryContainer = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

/** Jarak antarbagian halaman Galeri (banyak ruang kosong, gaya referensi). */
export const gallerySection = cn(galleryContainer, "pt-20 sm:pt-24 lg:pt-32");

/**
 * Kepala bagian Galeri: label kapital bernomor "• PILIHAN (01)", judul h2 dua warna, dan tautan pil
 * opsional (mis. "Lihat semua karya ↗"). `id` dipakai `aria-labelledby` di `<section>`.
 * Fase 7: label memudar, judul muncul per baris, dan tautan menyusul saat di-scroll (berjeda otomatis
 * dengan isi bagian yang terlihat bersamaan; isi tetap terlihat tanpa JS).
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
        <Reveal effect="fade">
          <SectionLabel index={index} className="border-t border-border pt-4">
            {eyebrow}
          </SectionLabel>
        </Reveal>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <TwoToneHeading id={id} as="h2" level="h2" first={title} second={second} reveal="scroll" className="max-w-3xl" />
        {action && (
          <Reveal effect="fade">
            <ArrowLink href={action.href} variant="secondary" size="lg">
              {action.label}
            </ArrowLink>
          </Reveal>
        )}
      </div>
    </div>
  );
}

/**
 * Label bernomor bagian ("• CERITA (01)") yang memudar saat di-scroll. Untuk bagian dengan judul h2
 * biasa (detail karya, Tentang); kelas jarak/garis tetap di label.
 */
export function RevealSectionLabel({
  index,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal effect="fade">
      <SectionLabel index={index} className={className}>
        {children}
      </SectionLabel>
    </Reveal>
  );
}
