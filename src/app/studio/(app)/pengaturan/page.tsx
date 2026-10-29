import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/features/auth/dal";
import { getAccountSecurity } from "@/features/auth/queries";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { getSettingsPageData } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function Page() {
  const session = await requireAdmin();
  const [data, account] = await Promise.all([getSettingsPageData(), getAccountSecurity(session)]);

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Pilar, format, hook, checklist, jadwal, bobot skor, profil publik Galeri, serta akun dan keamanan."
      />
      <SettingsTabs data={data} account={account} />
      <p className="mt-6 text-xs text-muted-foreground">
        Ekspor CSV/JSON dan backup database hadir di Fase 5.
      </p>
    </>
  );
}
