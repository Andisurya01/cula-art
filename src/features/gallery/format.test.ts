import { describe, expect, it } from "vitest";
import {
  artworkMeta,
  formatDimensions,
  formatPriceIdr,
  inquiryLink,
  instagramUrl,
  metaDescription,
  normalizeWhatsapp,
  paragraphs,
  priceLabel,
  tiktokUrl,
  whatsappLink,
} from "./format";

describe("format Galeri", () => {
  it("harga Rupiah tanpa desimal", () => {
    expect(formatPriceIdr(1_500_000).replace(/\s/g, " ")).toBe("Rp 1.500.000");
  });

  it("ukuran: hanya dimensi yang diisi, desimal koma", () => {
    expect(formatDimensions({ widthCm: 30, heightCm: 40, depthCm: null })).toBe("30 × 40 cm");
    expect(formatDimensions({ widthCm: 12.5, heightCm: 25, depthCm: 10 })).toBe("12,5 × 25 × 10 cm");
    expect(formatDimensions({ widthCm: null, heightCm: null, depthCm: null })).toBeNull();
  });

  it.each([
    ["6281234567890", "6281234567890"],
    ["081234567890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["12345", null],
    ["", null],
    [null, null],
  ])("normalizeWhatsapp(%s) → %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });

  it("tautan WhatsApp membawa judul + URL karya", () => {
    const link = inquiryLink(
      { whatsapp: "6281234567890", contactEmail: "andi@contoh.id" },
      { title: "Kepala Naga", url: "https://galeri.test/karya/kepala-naga" },
    );
    expect(link?.kind).toBe("whatsapp");
    const url = new URL(link!.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/6281234567890");
    const text = url.searchParams.get("text")!;
    expect(text).toContain('"Kepala Naga"');
    expect(text).toContain("https://galeri.test/karya/kepala-naga");
  });

  it("tanpa WhatsApp → email; tanpa keduanya → null", () => {
    const email = inquiryLink({ whatsapp: null, contactEmail: "andi@contoh.id" }, { title: "A", url: "https://x/karya/a" });
    expect(email?.kind).toBe("email");
    expect(email?.href.startsWith("mailto:andi@contoh.id?subject=")).toBe(true);
    expect(inquiryLink({ whatsapp: "", contactEmail: null }, { title: "A", url: "u" })).toBeNull();
  });

  it("tautan sosial dari handle", () => {
    expect(instagramUrl("@andi.gambar")).toBe("https://www.instagram.com/andi.gambar/");
    expect(tiktokUrl("andi_clay")).toBe("https://www.tiktok.com/@andi_clay");
    expect(instagramUrl("bukan handle/../")).toBeNull();
    expect(tiktokUrl(null)).toBeNull();
  });

  it("whatsappLink meng-encode pesan", () => {
    expect(whatsappLink("62812", "a b&c")).toBe("https://wa.me/62812?text=a%20b%26c");
  });
});

describe("teks kartu & detail", () => {
  it("priceLabel: harga, Harga atas permintaan, atau null untuk Koleksi pribadi/Terjual", () => {
    expect(priceLabel({ availability: "AVAILABLE", priceIdr: 2_000_000 })?.replace(/\s/g, " ")).toBe("Rp 2.000.000");
    expect(priceLabel({ availability: "SOLD", priceIdr: 750_000 })?.replace(/\s/g, " ")).toBe("Rp 750.000");
    expect(priceLabel({ availability: "AVAILABLE", priceIdr: null })).toBe("Harga atas permintaan");
    expect(priceLabel({ availability: "RESERVED", priceIdr: null })).toBe("Harga atas permintaan");
    expect(priceLabel({ availability: "NOT_FOR_SALE", priceIdr: null })).toBeNull();
    expect(priceLabel({ availability: "SOLD", priceIdr: null })).toBeNull();
  });

  it("artworkMeta: medium · tahun, bagian kosong dilewati", () => {
    expect(artworkMeta({ medium: "CLAY", year: 2026 })).toBe("Patung clay · 2026");
    expect(artworkMeta({ medium: "DRAWING", year: null })).toBe("Gambar");
    expect(artworkMeta({ medium: null, year: 2024 })).toBe("2024");
    expect(artworkMeta({ medium: null, year: null })).toBe("");
  });

  it("paragraphs: dipisah baris kosong, CRLF dan spasi dirapikan", () => {
    expect(paragraphs("Satu\r\nbaris dua\r\n\r\nParagraf dua\n  \n\n Tiga ")).toEqual([
      "Satu\nbaris dua",
      "Paragraf dua",
      "Tiga",
    ]);
    expect(paragraphs("   ")).toEqual([]);
    expect(paragraphs(null)).toEqual([]);
  });

  it("metaDescription: spasi dirapikan, dipotong di batas kata dengan elipsis", () => {
    expect(metaDescription("  Kepala naga\n dari clay.  ")).toBe("Kepala naga dari clay.");
    expect(metaDescription("")).toBeNull();
    expect(metaDescription(null)).toBeNull();
    const long = "kata ".repeat(60);
    const cut = metaDescription(long, 50)!;
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith("kata…")).toBe(true);
  });
});
