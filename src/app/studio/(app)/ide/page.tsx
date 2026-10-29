import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { IdeaBankLowBanner } from "@/features/ideas/components/idea-bank-low-banner";
import { IdeaCard } from "@/features/ideas/components/idea-card";
import { IdeaFiltersBar } from "@/features/ideas/components/idea-filters-bar";
import { NewIdeaButton } from "@/features/ideas/components/idea-form-dialog";
import { IdeaQuickAdd } from "@/features/ideas/components/idea-quick-add";
import { getIdeaCounts, getIdeas } from "@/features/ideas/queries";
import { parseIdeaFilters } from "@/features/ideas/schema";
import { getTaxonomies } from "@/features/settings/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Bank Ide" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = parseIdeaFilters(await searchParams);
  const [ideas, counts, taxonomies] = await Promise.all([
    getIdeas(filters),
    getIdeaCounts(),
    getTaxonomies(),
  ]);

  const options = {
    pillars: taxonomies.pillars.map(({ id, name, color }) => ({ id, name, color })),
    formats: taxonomies.formats.map(({ id, name }) => ({ id, name })),
    hookTypes: taxonomies.hookTypes.map(({ id, name }) => ({ id, name })),
  };

  return (
    <>
      <PageHeader
        title="Bank Ide"
        description="Catat ide secepatnya, nilai potensi dan effort, lalu jadikan konten."
        actions={<NewIdeaButton pillars={options.pillars}>Form lengkap</NewIdeaButton>}
      />

      <div className="grid gap-4">
        <IdeaBankLowBanner newCount={counts.newCount} />
        <IdeaQuickAdd />

        {counts.total === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="Bank ide masih kosong"
            description="Tulis ide pertamamu di kolom di atas, atau pakai form lengkap untuk menilai potensi dan effort-nya. Target awal: 5 ide."
            action={
              <NewIdeaButton pillars={options.pillars} variant="default">
                Tambah ide pertama
              </NewIdeaButton>
            }
          />
        ) : (
          <>
            <IdeaFiltersBar filters={filters} pillars={options.pillars} />
            {ideas.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada ide yang cocok"
                description="Ubah filter, atau tambah ide baru lewat kolom di atas."
                action={
                  <Button asChild variant="outline">
                    <Link href={routes.studio.ideas}>Tampilkan ide Baru</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{ideas.length} ide</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ideas.map((idea) => (
                    <IdeaCard key={idea.id} idea={idea} options={options} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
