import { PageTransition } from "@/components/motion/view-transitions";

/**
 * Transisi antarmenu Studio (Fase 7, A8): crossfade singkat tanpa geser arah (`vt-fade`, durasi
 * tingkat Halus default). Template dipasang ulang setiap navigasi; sidebar, bottom nav, dan tombol
 * + Ide ada di layout (tetap). Tanpa dukungan browser, tingkat Mati, atau kurangi gerakan: navigasi biasa.
 */
export default function StudioTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition variant="fade">
      <div>{children}</div>
    </PageTransition>
  );
}
