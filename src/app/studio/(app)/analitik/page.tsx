import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";

export const metadata: Metadata = { title: "Analitik" };

export default async function Page() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Analitik" />
      <EmptyState
        icon={BarChart3}
        title="Hadir di Fase 4"
        description="Grafik followers, engagement rate, median skor per pilar/format/hook/jam posting, dan top/bottom 5 post hadir di Fase 4, setelah metrik H+1 dan H+7 mulai dicatat."
      />
    </>
  );
}
