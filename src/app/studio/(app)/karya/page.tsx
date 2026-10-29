import type { Metadata } from "next";
import { Frame, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/dal";
import { ArtworkCard } from "@/features/artworks/components/artwork-card";
import { ArtworkFilters } from "@/features/artworks/components/artwork-filters";
import { NewArtworkDialog } from "@/features/artworks/components/new-artwork-dialog";
import { hasActiveFilter, parseArtworkFilters } from "@/features/artworks/filters";
import { getArtworkList } from "@/features/artworks/queries";

export const metadata: Metadata = { title: "Karya" };

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const filters = parseArtworkFilters(await searchParams);
  const artworks = await getArtworkList(filters);
  const filtered = hasActiveFilter(filters);

  const newButton = (
    <Button size="sm">
      <Plus />
      Karya baru
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Karya"
        description="Karya jadi yang tampil di Galeri. Hanya karya Terbit yang terlihat pengunjung."
        actions={<NewArtworkDialog trigger={newButton} />}
      />

      <ArtworkFilters filters={filters} />

      {artworks.length === 0 ? (
        <EmptyState
          icon={Frame}
          title={filtered ? "Tidak ada karya dengan filter ini" : "Belum ada karya"}
          description={
            filtered
              ? "Coba ubah atau hapus filter."
              : "Buat karya baru di sini, atau pakai Jadikan Karya dari detail proyek yang sudah selesai."
          }
          action={filtered ? undefined : <NewArtworkDialog trigger={newButton} />}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{artworks.length} karya</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {artworks.map((artwork) => (
              <li key={artwork.id}>
                <ArtworkCard artwork={artwork} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
