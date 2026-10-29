import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/** notFound() dari halaman Studio (mis. konten/proyek/karya yang sudah dihapus). */
export default function StudioNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Data tidak ditemukan"
      description="Mungkin sudah dihapus atau tautannya salah."
      action={
        <Button asChild variant="outline">
          <Link href={routes.studio.home}>Ke Beranda Studio</Link>
        </Button>
      }
    />
  );
}
