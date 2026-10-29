// Integrasi ke database test: aksi profil publik (simpan, hapus foto) dan pemindahan handle
// TikTok/IG dari "Target dan akun" ke Profil publik tanpa kehilangan data.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { routes } from "@/lib/routes";
import { generateStorageKey, readStoredFile, saveFile } from "@/lib/storage";
import { requireAdmin } from "@/features/auth/dal";
import { removeProfilePhoto, updateGeneralSettings, updatePublicProfile } from "./actions";
import { getSettings } from "./queries";
import { DEFAULT_POSTING_SLOTS } from "./schema";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const PROFILE = {
  siteName: "  Galeri Andi ",
  tagline: "Gambar dan patung clay",
  bio: "Belajar menggambar sejak 2024.",
  aboutText: "Paragraf satu.\r\n\r\nParagraf dua.",
  city: "Bandung",
  whatsapp: "0812-3456-7890",
  contactEmail: " andi@contoh.id ",
  igHandle: "@andi.gambar",
  tiktokHandle: "https://www.tiktok.com/@andi.clay",
};

async function storedFile(): Promise<string> {
  const key = generateStorageKey("webp");
  await saveFile(key, new Uint8Array([1, 2, 3]));
  return key;
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("updatePublicProfile", () => {
  it("menyimpan nilai yang sudah dinormalisasi dan me-revalidate Galeri + Pengaturan", async () => {
    await db.setting.create({ data: { id: "default", weeklyPostTarget: 4, avatarKey: "a".repeat(32) + ".webp" } });

    const result = await updatePublicProfile(PROFILE);
    expect(result).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalledTimes(1);

    const row = await db.setting.findUniqueOrThrow({ where: { id: "default" } });
    expect(row).toMatchObject({
      siteName: "Galeri Andi",
      tagline: "Gambar dan patung clay",
      bio: "Belajar menggambar sejak 2024.",
      aboutText: "Paragraf satu.\n\nParagraf dua.",
      city: "Bandung",
      whatsapp: "6281234567890",
      contactEmail: "andi@contoh.id",
      igHandle: "andi.gambar",
      tiktokHandle: "andi.clay",
      // field di luar profil tidak tersentuh
      weeklyPostTarget: 4,
      avatarKey: "a".repeat(32) + ".webp",
    });
    expect(revalidatePath).toHaveBeenCalledWith(routes.studio.settings);
    expect(revalidatePath).toHaveBeenCalledWith(routes.gallery.home, "layout");
  });

  it("field kosong disimpan null", async () => {
    await updatePublicProfile(PROFILE);
    const result = await updatePublicProfile({
      siteName: "Galeri Andi",
      tagline: "",
      bio: "  ",
      aboutText: "",
      city: "",
      whatsapp: "",
      contactEmail: "",
      igHandle: "",
      tiktokHandle: "@",
    });
    expect(result.ok).toBe(true);
    const row = await db.setting.findUniqueOrThrow({ where: { id: "default" } });
    expect(row).toMatchObject({
      tagline: null,
      bio: null,
      aboutText: null,
      city: null,
      whatsapp: null,
      contactEmail: null,
      igHandle: null,
      tiktokHandle: null,
    });
  });

  it("input tidak valid ditolak dengan error per field dan tidak mengubah data", async () => {
    await updatePublicProfile(PROFILE);
    vi.mocked(revalidatePath).mockClear();

    const result = await updatePublicProfile({ ...PROFILE, whatsapp: "0812abc", contactEmail: "andi@" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.whatsapp?.[0]).toMatch(/WhatsApp tidak valid/);
    expect(result.fieldErrors?.contactEmail?.[0]).toMatch(/Email tidak valid/);

    const row = await db.setting.findUniqueOrThrow({ where: { id: "default" } });
    expect(row.whatsapp).toBe("6281234567890");
    expect(row.contactEmail).toBe("andi@contoh.id");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("baris Setting yang belum ada dibuat dengan slot posting default", async () => {
    expect(await db.setting.count()).toBe(0);
    expect((await updatePublicProfile(PROFILE)).ok).toBe(true);
    const settings = await getSettings();
    expect(settings.postingSlots).toEqual(DEFAULT_POSTING_SLOTS);
    expect(settings.profile).toMatchObject({ siteName: "Galeri Andi", whatsapp: "6281234567890", avatarKey: null });
  });
});

describe("handle TikTok/IG pindah ke Profil publik", () => {
  it("updateGeneralSettings hanya mengubah target; handle lama tetap ada", async () => {
    await db.setting.create({ data: { id: "default", igHandle: "andi.gambar", tiktokHandle: "andi.clay" } });

    // Client lama yang masih mengirim handle kosong tidak boleh menghapusnya.
    const result = await updateGeneralSettings({ weeklyPostTarget: 5, igHandle: "", tiktokHandle: null });
    expect(result.ok).toBe(true);

    const row = await db.setting.findUniqueOrThrow({ where: { id: "default" } });
    expect(row).toMatchObject({ weeklyPostTarget: 5, igHandle: "andi.gambar", tiktokHandle: "andi.clay" });
  });

  it("getSettings membawa handle di profile (sumber form Profil publik)", async () => {
    await db.setting.create({ data: { id: "default", igHandle: "andi.gambar", tiktokHandle: "andi.clay" } });
    const settings = await getSettings();
    expect(settings.profile.igHandle).toBe("andi.gambar");
    expect(settings.profile.tiktokHandle).toBe("andi.clay");
  });
});

describe("removeProfilePhoto", () => {
  it("mengosongkan avatarKey dan menghapus filenya", async () => {
    const key = await storedFile();
    await db.setting.create({ data: { id: "default", avatarKey: key } });
    expect(await readStoredFile(key)).not.toBeNull();

    expect(await removeProfilePhoto()).toEqual({ ok: true, data: undefined });
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect((await db.setting.findUniqueOrThrow({ where: { id: "default" } })).avatarKey).toBeNull();
    expect(await readStoredFile(key)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(routes.gallery.home, "layout");
  });

  it("tanpa foto tetap berhasil", async () => {
    expect((await removeProfilePhoto()).ok).toBe(true);
    expect((await db.setting.findUniqueOrThrow({ where: { id: "default" } })).avatarKey).toBeNull();
  });
});
