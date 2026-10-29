"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSecurity } from "@/features/auth/components/account-security";
import type { AccountSecurity as AccountSecurityData } from "@/features/auth/queries";
import type { SettingsPageData } from "../queries";
import { GeneralSettingsCard } from "./general-settings-card";
import { PillarCard } from "./pillar-card";
import { PostingSlotsCard } from "./posting-slots-card";
import { ProfilePhotoCard } from "./profile-photo-card";
import { PublicProfileForm } from "./public-profile-form";
import { ScoreWeightsCard } from "./score-weights-card";
import { SimpleListCard } from "./simple-list-card";

/** Pengaturan dibagi per tab; daftar tab bisa digeser horizontal di HP. */
export function SettingsTabs({ data, account }: { data: SettingsPageData; account: AccountSecurityData }) {
  const { settings } = data;

  return (
    <Tabs defaultValue="pilar" className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList className="w-max min-w-full md:min-w-0">
          <TabsTrigger value="pilar">Pilar</TabsTrigger>
          <TabsTrigger value="format">Format & Hook</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
          <TabsTrigger value="skor">Skor</TabsTrigger>
          <TabsTrigger value="profil">Profil publik</TabsTrigger>
          <TabsTrigger value="keamanan">Akun & keamanan</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pilar">
        <PillarCard pillars={data.pillars} />
      </TabsContent>

      <TabsContent value="format" className="grid gap-4 md:grid-cols-2 md:items-start">
        <SimpleListCard
          kind="format"
          title="Format"
          description="Bentuk video, mis. Time-lapse atau Before/After."
          placeholder="Format baru"
          items={data.formats}
        />
        <SimpleListCard
          kind="hookType"
          title="Tipe hook"
          description="Jenis pembuka 3 detik pertama."
          placeholder="Tipe hook baru"
          items={data.hookTypes}
        />
      </TabsContent>

      <TabsContent value="checklist">
        <SimpleListCard
          kind="checklist"
          title="Checklist produksi"
          description="Disalin ke setiap konten baru. Perubahan tidak mengubah checklist konten yang sudah ada."
          placeholder="Item checklist baru"
          items={data.checklist}
          showUsage={false}
        />
      </TabsContent>

      <TabsContent value="jadwal" className="grid gap-4">
        <GeneralSettingsCard weeklyPostTarget={settings.weeklyPostTarget} />
        <PostingSlotsCard slots={settings.postingSlots} />
      </TabsContent>

      <TabsContent value="skor">
        <ScoreWeightsCard weights={settings.scoreWeights} />
      </TabsContent>

      <TabsContent value="profil" className="grid max-w-3xl gap-4">
        <ProfilePhotoCard avatarKey={settings.profile.avatarKey} />
        <PublicProfileForm profile={settings.profile} />
      </TabsContent>

      <TabsContent value="keamanan">
        <AccountSecurity data={account} />
      </TabsContent>
    </Tabs>
  );
}
