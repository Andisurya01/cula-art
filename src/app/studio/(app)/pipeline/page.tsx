import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { NewContentDialog } from "@/features/contents/components/new-content-dialog";
import { PipelineBoard } from "@/features/contents/components/pipeline-board";
import { getPipelineBoard } from "@/features/contents/queries";

export const metadata: Metadata = { title: "Pipeline" };

export default async function Page() {
  await requireAdmin();
  const { cards, postedTotal, pillars, now } = await getPipelineBoard();

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Lacak produksi konten dari perencanaan sampai posting."
        actions={<NewContentDialog pillars={pillars} />}
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Pipeline masih kosong"
          description="Buat konten baru, atau pilih ide di Bank Ide lalu Jadikan Konten."
        />
      ) : (
        <PipelineBoard cards={cards} postedTotal={postedTotal} now={now} />
      )}
    </>
  );
}
