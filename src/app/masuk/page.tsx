import type { Metadata } from "next";
import { LoginFlow } from "@/features/auth/components/login-flow";
import { ClearStudioCaches } from "@/features/pwa/components/clear-studio-caches";
import { getCurrentSession } from "@/features/auth/session";
import { safeNextPath } from "@/lib/routes";

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
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      {/* Keluar atau sesi habis: cache service worker Studio dihapus (antrean ide offline tetap). */}
      {!signedIn && <ClearStudioCaches />}
      <LoginFlow next={next} signedIn={signedIn} />
    </main>
  );
}
