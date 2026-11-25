import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Lightbulb } from "lucide-react";
import { StudioMark } from "@/components/layout/studio-mark";
import { ThemeModeToggle } from "@/components/design/theme-mode-toggle";
import { Button } from "@/components/ui/button";
import { LoginFlow } from "@/features/auth/components/login-flow";
import { ClearStudioCaches } from "@/features/pwa/components/clear-studio-caches";
import { getCurrentSession } from "@/features/auth/session";
import { routes, safeNextPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
  // Tidak redirect di server: setelah setup 2FA, aksi memasang cookie sesi dan Next me-refresh
  // halaman ini; kode pemulihan harus tetap tampil (state client bertahan saat refresh).
  const signedIn = (await getCurrentSession()) !== null;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Keluar atau sesi habis: cache service worker Studio dihapus (antrean ide offline tetap). */}
      {!signedIn && <ClearStudioCaches />}
      <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <StudioMark />
          <span className="font-heading text-h6">Studio</span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" className="h-10">
            <Link href={routes.gallery.home}>
              <ArrowLeft />
              Galeri
            </Link>
          </Button>
          <ThemeModeToggle className="size-10" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid w-full max-w-md gap-4 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <LoginShowcase />
          <LoginFlow next={next} signedIn={signedIn} className="lg:col-start-2" />
        </div>
      </main>
    </div>
  );
}

/**
 * Kolase bento hiasan di samping form (hanya ≥ 1024 px), gaya referensi Studio. Tanpa angka atau data:
 * hanya menyebut isi Studio, jadi disembunyikan dari pembaca layar.
 */
function LoginShowcase() {
  return (
    <div aria-hidden className="hidden grid-cols-2 grid-rows-[1fr_auto] gap-4 lg:grid">
      <div className="col-span-2 flex flex-col justify-between gap-10 rounded-card bg-bento-dark p-8 text-bento-dark-foreground">
        <p className="type-label">Studio karya · khusus pemilik</p>
        <p className="font-heading text-h3 text-balance xl:text-h2">Rencanakan konten, catat karya, belajar dari data.</p>
      </div>
      <div className="flex flex-col gap-6 rounded-card bg-bento-lime p-6 text-bento-lime-foreground">
        <span className="flex size-10 items-center justify-center rounded-full bg-bento-lime-foreground/10">
          <Lightbulb className="size-5" />
        </span>
        <p className="font-heading text-h5">Bank ide dan pipeline konten</p>
      </div>
      <div className="flex flex-col gap-6 rounded-card bg-bento-blue p-6 text-bento-blue-foreground">
        <span className="flex size-10 items-center justify-center rounded-full bg-bento-blue-foreground/15">
          <CalendarDays className="size-5" />
        </span>
        <p className="font-heading text-h5">Kalender, metrik, dan saran mingguan</p>
      </div>
    </div>
  );
}
