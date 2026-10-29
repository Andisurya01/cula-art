import type { Metadata } from "next";
import { GalleryShell } from "@/features/gallery/components/layout/gallery-shell";
import { getGalleryProfile } from "@/features/gallery/queries";

// Halaman Galeri di-cache; aksi Studio memanggil revalidateGallery(). Revalidasi per jam hanya cadangan.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getGalleryProfile();
  const description =
    profile.tagline ?? profile.bio ?? "Karya gambar dan patung clay, lengkap dengan cerita prosesnya.";
  return {
    title: { default: profile.siteName, template: `%s · ${profile.siteName}` },
    description,
    openGraph: { siteName: profile.siteName, locale: "id_ID", type: "website", description },
  };
}

export default async function GaleriLayout({ children }: { children: React.ReactNode }) {
  const profile = await getGalleryProfile();
  return <GalleryShell profile={profile}>{children}</GalleryShell>;
}
