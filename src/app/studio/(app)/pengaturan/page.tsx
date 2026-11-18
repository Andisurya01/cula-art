import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getAiSettingsPageData } from "@/features/ai/queries";
import { requireAdmin } from "@/features/auth/dal";
import { getAccountSecurity } from "@/features/auth/queries";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { getSettingsPageData } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function Page() {
  const session = await requireAdmin();
  const [data, ai, account] = await Promise.all([
    getSettingsPageData(),
    getAiSettingsPageData(),
    getAccountSecurity(session),
  ]);

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Pilar, format, hook, checklist, jadwal, bobot skor, profil publik Galeri, Panduan AI, akun dan keamanan, serta ekspor data."
      />
      <SettingsTabs data={data} ai={ai} account={account} />
    </>
  );
}
