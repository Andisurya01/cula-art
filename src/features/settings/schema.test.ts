import { describe, expect, it } from "vitest";
import {
  cleanHandleInput,
  generalSettingsSchema,
  normalizeWhatsappInput,
  PROFILE_LIMITS,
  publicProfileSchema,
  WHATSAPP_ERROR,
  type PublicProfileInput,
} from "./schema";

const EMPTY: PublicProfileInput = {
  siteName: "Galeri Andi",
  tagline: "",
  bio: "",
  aboutText: "",
  city: "",
  whatsapp: "",
  contactEmail: "",
  igHandle: "",
  tiktokHandle: "",
};

function parse(overrides: Partial<PublicProfileInput>) {
  return publicProfileSchema.safeParse({ ...EMPTY, ...overrides });
}

function errorOf(overrides: Partial<PublicProfileInput>, field: keyof PublicProfileInput) {
  const result = parse(overrides);
  expect(result.success).toBe(false);
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("normalizeWhatsappInput", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["0812 3456 7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["+62 (0)812 3456 7890", "6281234567890"],
    ["+62 0812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["  (0812) 3456.7890 ", "6281234567890"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeWhatsappInput(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "0812abc4567",
    "wa.me/6281234567890",
    "081234", // terlalu pendek
    "0812345678901234567", // terlalu panjang
    "+1 415 555 0100", // bukan nomor Indonesia
    "812 3456 7890", // tanpa 0 / 62
  ])("%s → null", (input) => {
    expect(normalizeWhatsappInput(input)).toBeNull();
  });
});

describe("cleanHandleInput", () => {
  it.each([
    ["andi.gambar", "andi.gambar"],
    ["@andi.gambar", "andi.gambar"],
    ["  @@andi_gambar ", "andi_gambar"],
    ["https://www.instagram.com/andi.gambar/", "andi.gambar"],
    ["instagram.com/andi.gambar?igsh=abc", "andi.gambar"],
    ["https://www.tiktok.com/@andi.gambar", "andi.gambar"],
    ["https://m.tiktok.com/@andi.gambar/video/123", "andi.gambar"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(cleanHandleInput(input)).toBe(expected);
  });
});

describe("publicProfileSchema", () => {
  it("string kosong dan spasi → null; nama situs dipangkas", () => {
    const result = parse({
      siteName: "  Galeri   Andi  ",
      tagline: "   ",
      bio: "\n",
      aboutText: " \n\n ",
      city: " ",
      whatsapp: "  ",
      contactEmail: " ",
      igHandle: "@",
      tiktokHandle: "",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      siteName: "Galeri Andi",
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

  it("null/undefined pada field opsional → null", () => {
    const result = publicProfileSchema.safeParse({ siteName: "Galeri", tagline: null, whatsapp: undefined });
    expect(result.success).toBe(true);
    expect(result.data?.tagline).toBeNull();
    expect(result.data?.whatsapp).toBeNull();
    expect(result.data?.igHandle).toBeNull();
  });

  it("nama situs wajib", () => {
    expect(errorOf({ siteName: "   " }, "siteName")).toBe("Nama situs wajib diisi");
    expect(publicProfileSchema.safeParse({}).success).toBe(false);
  });

  it("WhatsApp dinormalisasi ke 62…; yang tidak valid ditolak", () => {
    expect(parse({ whatsapp: "0812-3456-7890" }).data?.whatsapp).toBe("6281234567890");
    expect(parse({ whatsapp: "+62 812 3456 7890" }).data?.whatsapp).toBe("6281234567890");
    expect(errorOf({ whatsapp: "0812abc" }, "whatsapp")).toBe(WHATSAPP_ERROR);
    expect(errorOf({ whatsapp: "12345" }, "whatsapp")).toBe(WHATSAPP_ERROR);
  });

  it("email kontak divalidasi dan dipangkas", () => {
    expect(parse({ contactEmail: "  andi@contoh.id " }).data?.contactEmail).toBe("andi@contoh.id");
    expect(errorOf({ contactEmail: "andi@" }, "contactEmail")).toMatch(/Email tidak valid/);
    expect(errorOf({ contactEmail: "bukan email" }, "contactEmail")).toMatch(/Email tidak valid/);
    const long = `${"a".repeat(250)}@contoh.id`;
    expect(errorOf({ contactEmail: long }, "contactEmail")).toMatch(/Email tidak valid/);
  });

  it("handle: @ dan tautan profil dibuang; karakter aneh ditolak", () => {
    const result = parse({ igHandle: "https://www.instagram.com/andi.gambar/", tiktokHandle: "@andi_clay" });
    expect(result.data?.igHandle).toBe("andi.gambar");
    expect(result.data?.tiktokHandle).toBe("andi_clay");
    expect(errorOf({ igHandle: "andi gambar" }, "igHandle")).toMatch(/huruf, angka/);
    expect(errorOf({ tiktokHandle: "a".repeat(31) }, "tiktokHandle")).toMatch(/maksimal 30/);
  });

  it.each([
    ["siteName", PROFILE_LIMITS.siteName],
    ["tagline", PROFILE_LIMITS.tagline],
    ["bio", PROFILE_LIMITS.bio],
    ["aboutText", PROFILE_LIMITS.aboutText],
    ["city", PROFILE_LIMITS.city],
  ] as const)("batas panjang %s = %i karakter", (field, max) => {
    expect(parse({ [field]: "a".repeat(max) }).success).toBe(true);
    expect(errorOf({ [field]: "a".repeat(max + 1) }, field)).toMatch(new RegExp(`maksimal ${max} karakter`));
  });

  it("cerita Tentang mempertahankan paragraf; field satu baris dirapikan", () => {
    const result = parse({
      aboutText: "  Paragraf satu.\r\nMasih satu.  \r\n\r\n\r\n\r\n  Paragraf  dua. ",
      tagline: "Gambar\n dan  clay",
      bio: "Bio\nsingkat",
    });
    expect(result.data?.aboutText).toBe("Paragraf satu.\nMasih satu.\n\nParagraf dua.");
    expect(result.data?.tagline).toBe("Gambar dan clay");
    expect(result.data?.bio).toBe("Bio singkat");
  });

  it("idempoten: hasil parse (dikirim form ke aksi) lolos lagi tanpa berubah", () => {
    const first = parse({
      siteName: " Galeri Andi ",
      tagline: "Gambar & clay",
      aboutText: "Satu.\n\nDua.",
      city: "Bandung",
      whatsapp: "0812 3456 7890",
      contactEmail: "andi@contoh.id",
      igHandle: "@andi.gambar",
      tiktokHandle: "https://www.tiktok.com/@andi.clay",
    });
    expect(first.success).toBe(true);
    const second = publicProfileSchema.safeParse(first.data);
    expect(second.data).toEqual(first.data);
  });
});

describe("generalSettingsSchema", () => {
  it("hanya target mingguan; handle lama yang ikut terkirim diabaikan (tidak menimpa)", () => {
    const result = generalSettingsSchema.safeParse({ weeklyPostTarget: 3, igHandle: "x", tiktokHandle: null });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ weeklyPostTarget: 3 });
  });

  it("target 1-14", () => {
    expect(generalSettingsSchema.safeParse({ weeklyPostTarget: 0 }).success).toBe(false);
    expect(generalSettingsSchema.safeParse({ weeklyPostTarget: 15 }).success).toBe(false);
  });
});
