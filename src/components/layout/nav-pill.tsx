import { ViewTransition } from "react";
import { VT_CLASS } from "@/components/motion/view-transitions";
import { cn } from "@/lib/utils";

/**
 * Nama View Transition penanda menu aktif. Berbeda per menu, karena sidebar (desktop) dan bottom nav
 * (HP) sama-sama ada di DOM dan nama transisi harus unik di satu halaman.
 */
export const NAV_PILL_NAME = {
  sidebar: "studio-nav-pill-sidebar",
  bottom: "studio-nav-pill-bottom",
} as const;

/**
 * Pil menu aktif Studio (Fase 7, A8). Lapisan terpisah di atas item aktif (`relative`), berisi salinan
 * ikon + label dalam warna primer; isi asli item tetap di bawahnya sebagai nama aksesibel, jadi pil ini
 * `aria-hidden` dan tidak menangkap klik.
 *
 * Saat navigasi, pil di item lama dilepas dan pil di item baru dipasang dengan `name` yang sama, jadi
 * React + View Transitions menggesernya dari menu lama ke menu baru (kelas `vt-pill`, durasi token),
 * sementara labelnya berganti di dalam pil. Tanpa dukungan browser, tingkat Mati, atau "kurangi
 * gerakan": pil langsung pindah. Tanpa JavaScript: pil dirender server di item aktif seperti biasa.
 * `className`: tata letak isi pil, sama dengan isi item (baris di sidebar, kolom di bottom nav).
 */
export function NavPill({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition name={name} share={VT_CLASS.pill} default="none">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-button bg-primary font-medium text-primary-foreground",
          className,
        )}
      >
        {children}
      </span>
    </ViewTransition>
  );
}
