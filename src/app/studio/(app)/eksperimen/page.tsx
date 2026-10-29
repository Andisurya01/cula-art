import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";

export const metadata: Metadata = { title: "Eksperimen" };

export default async function Page() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Eksperimen" />
      <EmptyState
        icon={FlaskConical}
        title="Hadir di Fase 5"
        description="Uji hipotesis (hook, format, jam, durasi, cover) dengan post varian A vs B, lalu tandai Terbukti / Tidak terbukti / Belum jelas. Hadir di Fase 5."
      />
    </>
  );
}
