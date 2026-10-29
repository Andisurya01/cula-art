import { describe, expect, it } from "vitest";
import type { GalleryArtworkDetail } from "./dto";
import { artworkJsonLd, serializeJsonLd } from "./seo";

const base: GalleryArtworkDetail = {
  slug: "kepala-naga",
  title: "Kepala Naga",
  medium: "CLAY",
  year: 2026,
  availability: "AVAILABLE",
  priceIdr: null,
  cover: { src: "/media/a.webp", width: 800, height: 1000, alt: "Kepala naga" },
  summary: "  Naga kecil dari clay  ",
  description: "Cerita panjang",
  widthCm: 12.5,
  heightCm: 20,
  depthCm: null,
  materials: "Clay polimer, akrilik",
  images: [],
  processImages: [],
  processLinks: [],
  publishedAt: new Date("2026-10-01T03:00:00Z"),
  updatedAt: new Date("2026-10-02T03:00:00Z"),
};

describe("JSON-LD VisualArtwork", () => {
  it("field publik dari DTO, ukuran dalam cm, field kosong dibuang", () => {
    const data = artworkJsonLd({
      artwork: base,
      url: "https://galeri.test/karya/kepala-naga",
      imageUrls: ["https://galeri.test/media/a.webp"],
      creator: { name: "Galeri Andi", url: "https://galeri.test/tentang" },
    });
    const parsed = JSON.parse(serializeJsonLd(data));
    expect(parsed).toEqual({
      "@context": "https://schema.org",
      "@type": "VisualArtwork",
      name: "Kepala Naga",
      url: "https://galeri.test/karya/kepala-naga",
      image: ["https://galeri.test/media/a.webp"],
      description: "Naga kecil dari clay",
      artform: "Patung clay",
      artMedium: "Clay polimer, akrilik",
      dateCreated: "2026",
      datePublished: "2026-10-01T03:00:00.000Z",
      dateModified: "2026-10-02T03:00:00.000Z",
      width: { "@type": "QuantitativeValue", value: 12.5, unitCode: "CMT" },
      height: { "@type": "QuantitativeValue", value: 20, unitCode: "CMT" },
      creator: { "@type": "Person", name: "Galeri Andi", url: "https://galeri.test/tentang" },
      inLanguage: "id-ID",
    });
  });

  it("tanpa ringkasan → deskripsi; tanpa foto/medium/tahun → field tidak ada", () => {
    const data = artworkJsonLd({
      artwork: { ...base, summary: null, medium: null, year: null, materials: " ", publishedAt: null },
      url: "https://galeri.test/karya/x",
      imageUrls: [],
      creator: { name: "A" },
    });
    const parsed = JSON.parse(serializeJsonLd(data));
    expect(parsed.description).toBe("Cerita panjang");
    for (const key of ["image", "artform", "artMedium", "dateCreated", "datePublished", "depth"]) {
      expect(parsed).not.toHaveProperty(key);
    }
    expect(parsed.creator).toEqual({ "@type": "Person", name: "A" });
  });

  it("serializeJsonLd meng-escape < supaya </script> di teks tidak menutup tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>", line: "a\u2028b" });
    expect(out).not.toContain("<");
    expect(out).toContain(String.raw`\u003c/script>`);
    expect(out).toContain(String.raw`a\u2028b`);
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>", line: "a\u2028b" });
  });
});
