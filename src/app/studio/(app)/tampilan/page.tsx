import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { ThemeEditor } from "@/features/theme/components/theme-editor";
import { getThemeSettings } from "@/features/theme/queries";

export const metadata: Metadata = { title: "Tampilan" };

export default async function Page() {
  await requireAdmin();
  const { tokens, isCustomized } = await getThemeSettings();
  return (
    <>
      <PageHeader
        title="Tampilan"
        description="Warna, font, ukuran teks, bentuk, dan animasi untuk Galeri dan Studio. Perubahan baru berlaku setelah disimpan."
      />
      <ThemeEditor initialTokens={tokens} isCustomized={isCustomized} />
    </>
  );
}
