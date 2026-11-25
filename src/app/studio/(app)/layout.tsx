import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickIdeaDialog, QuickIdeaFab } from "@/components/layout/quick-idea";
import { StudioProviders } from "@/components/layout/studio-providers";
import { db } from "@/lib/db";
import { requireAdmin } from "@/features/auth/dal";
import { AiStatusProvider } from "@/features/ai/components/ai-status";
import { getAiStatus } from "@/features/ai/queries";
import { OfflineIdeaSync } from "@/features/pwa/components/offline-idea-sync";
import { StudioServiceWorker } from "@/features/pwa/components/studio-service-worker";

// Semua halaman Studio membaca database pada setiap request (tanpa prerender/cache).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  robots: { index: false, follow: false },
  // PWA hanya untuk Studio (E10): manifest dan service worker tidak pernah dipasang di Galeri.
  manifest: "/studio.webmanifest",
  appleWebApp: { capable: true, title: "Studio", statusBarStyle: "default" },
  icons: { apple: "/studio-icons/apple-touch-icon.png" },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [pillars, aiStatus] = await Promise.all([
    db.pillar.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    }),
    getAiStatus(),
  ]);

  return (
    <StudioProviders>
      <AiStatusProvider status={aiStatus}>
        <div className="flex min-h-svh">
          <AppSidebar />
          {/* HP: ruang bawah untuk bilah bottom nav mengambang + tombol + Ide. Desktop: sidebar sudah berjarak 12 px. */}
          <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] md:pt-8 md:pr-8 md:pb-10 md:pl-6 lg:pl-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
          <BottomNav />
          <QuickIdeaFab />
          <QuickIdeaDialog pillars={pillars} />
          <OfflineIdeaSync />
          <StudioServiceWorker />
        </div>
      </AiStatusProvider>
    </StudioProviders>
  );
}
