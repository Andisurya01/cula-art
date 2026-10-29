import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickIdeaDialog, QuickIdeaFab } from "@/components/layout/quick-idea";
import { StudioProviders } from "@/components/layout/studio-providers";
import { db } from "@/lib/db";
import { requireAdmin } from "@/features/auth/dal";

// Semua halaman Studio membaca database pada setiap request (tanpa prerender/cache).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  robots: { index: false, follow: false },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pillars = await db.pillar.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true },
  });

  return (
    <StudioProviders>
      <div className="flex min-h-svh">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <BottomNav />
        <QuickIdeaFab />
        <QuickIdeaDialog pillars={pillars} />
      </div>
    </StudioProviders>
  );
}
