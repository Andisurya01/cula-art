import { describe, expect, it } from "vitest";
import { SLUG_ERRORS } from "./rules";
import { artworkContentsSchema, artworkDetailSchema, type ArtworkDetailFormValues } from "./schema";

const base: ArtworkDetailFormValues = {
  title: "Kepala Naga",
  autoSlug: false,
  slug: "kepala-naga",
  summary: "",
  description: "",
  medium: "CLAY",
  year: "2026",
  widthCm: "",
  heightCm: "",
  depthCm: "",
  materials: "",
  weightGram: "",
  projectId: null,
  availability: "NOT_FOR_SALE",
  priceIdr: "",
  showPrice: false,
  isFeatured: false,
  featuredOrder: "",
};

function parse(patch: Partial<ArtworkDetailFormValues>) {
  return artworkDetailSchema.safeParse({ ...base, ...patch });
}

describe("artworkDetailSchema", () => {
  it("nilai form kosong → null, featuredOrder kosong → 0", () => {
    const result = parse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      summary: null,
      description: null,
      year: 2026,
      widthCm: null,
      weightGram: null,
      priceIdr: null,
      featuredOrder: 0,
    });
  });

  it("ukuran desimal dengan koma atau titik", () => {
    const result = parse({ widthCm: "12,5", heightCm: "30.25", depthCm: " 4 " });
    expect(result.success && result.data).toMatchObject({ widthCm: 12.5, heightCm: 30.25, depthCm: 4 });
    expect(parse({ widthCm: "0" }).success).toBe(false);
    expect(parse({ widthCm: "abc" }).success).toBe(false);
  });

  it("harga Rupiah bulat: titik ribuan dan awalan Rp diterima, sen ditolak", () => {
    expect(parse({ priceIdr: "1.500.000" }).data?.priceIdr).toBe(1_500_000);
    expect(parse({ priceIdr: "Rp 750.000" }).data?.priceIdr).toBe(750_000);
    expect(parse({ priceIdr: "1500000" }).data?.priceIdr).toBe(1_500_000);
    expect(parse({ priceIdr: "1,5" }).success).toBe(false);
    expect(parse({ priceIdr: "-5" }).success).toBe(false);
    expect(parse({ priceIdr: "3000000000" }).success).toBe(false);
  });

  it("tampilkan harga butuh harga", () => {
    const result = parse({ showPrice: true, priceIdr: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["priceIdr"]);
    expect(parse({ showPrice: true, priceIdr: "100000" }).success).toBe(true);
  });

  it("slug manual wajib valid; slug otomatis tidak dicek (dibuat ulang dari judul di server)", () => {
    const bad = parse({ slug: "Kepala Naga" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]).toMatchObject({ path: ["slug"], message: SLUG_ERRORS.format });
    expect(parse({ slug: "", autoSlug: true }).success).toBe(true);
  });

  it("tahun dan medium", () => {
    expect(parse({ year: "1800" }).success).toBe(false);
    expect(parse({ year: "", medium: null }).success).toBe(true);
    expect(parse({ medium: "KAYU" as never }).success).toBe(false);
  });
});

describe("artworkContentsSchema", () => {
  it("menolak konten ganda", () => {
    expect(artworkContentsSchema.safeParse({ artworkId: "a", contentIds: ["c1", "c1"] }).success).toBe(false);
    expect(artworkContentsSchema.safeParse({ artworkId: "a", contentIds: [] }).success).toBe(true);
  });
});
