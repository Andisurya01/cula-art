import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";

export const metadata: Metadata = { title: "Review Mingguan" };

export default async function Page() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Review Mingguan" />
      <EmptyState
        icon={NotebookPen}
        title="Hadir di Fase 5"
        description="Ringkasan otomatis minggu ini, refleksi (apa yang berhasil, diulang, dihentikan), snapshot followers, dan rencana minggu depan. Hadir di Fase 5."
      />
    </>
  );
}
