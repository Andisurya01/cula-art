import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";

export const metadata: Metadata = { title: "Postingan" };

export default async function Page() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Postingan" />
      <EmptyState
        icon={ListChecks}
        title="Hadir di Fase 4"
        description="Arsip semua post TikTok dan Instagram, badge Perlu H+1 / Perlu H+7, dan form metrik singkat (< 1 menit) hadir di Fase 4. Untuk sekarang, URL dan waktu posting dicatat di detail konten di Pipeline."
      />
    </>
  );
}
