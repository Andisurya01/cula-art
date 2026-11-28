import { PageTransition } from "@/components/motion/view-transitions";

/**
 * Transisi antarhalaman Galeri (Fase 7, A8): template dipasang ulang setiap navigasi, jadi isi lama
 * memudar cepat dan isi baru masuk lembut (`vt-page`). Foto bersama katalog → detail punya nama
 * sendiri (`SharedElement`) dan "melebar" di atas transisi ini. Header dan footer ada di layout
 * (tetap). Tanpa dukungan browser, tingkat Mati, atau kurangi gerakan: navigasi biasa.
 */
export default function GaleriTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition variant="page">
      <div>{children}</div>
    </PageTransition>
  );
}
