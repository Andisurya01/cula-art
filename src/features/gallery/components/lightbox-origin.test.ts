import { describe, expect, it } from "vitest";
import { ORIGIN_MIN_SCALE, ORIGIN_SUBTLE_SCALE, lightboxOrigin } from "./lightbox-origin";

const rect = { left: 100, top: 200, width: 300, height: 400 };

describe("lightboxOrigin", () => {
  it("Penuh: pusat foto asal dan skala selebar foto terhadap layar", () => {
    expect(lightboxOrigin(rect, 1200, "full")).toEqual({ x: 250, y: 400, scale: 0.25 });
  });

  it("Halus: skala dekat 1 (tanpa gerak besar), pusat tetap dari foto", () => {
    expect(lightboxOrigin(rect, 1200, "subtle")).toEqual({ x: 250, y: 400, scale: ORIGIN_SUBTLE_SCALE });
    // Foto hampir selebar layar: skala asli dipakai jika lebih besar.
    expect(lightboxOrigin({ ...rect, width: 1176 }, 1200, "subtle")?.scale).toBe(0.98);
  });

  it("Mati / kurangi gerakan: tanpa zoom (null)", () => {
    expect(lightboxOrigin(rect, 1200, "off")).toBeNull();
  });

  it("foto mini tidak tumbuh dari titik; foto lebih lebar dari layar dibatasi 1", () => {
    expect(lightboxOrigin({ ...rect, width: 20 }, 1200, "full")?.scale).toBe(ORIGIN_MIN_SCALE);
    expect(lightboxOrigin({ ...rect, width: 1500 }, 1200, "full")?.scale).toBe(1);
  });

  it("kotak tidak valid (tersembunyi, NaN, layar 0) → null", () => {
    expect(lightboxOrigin(null, 1200, "full")).toBeNull();
    expect(lightboxOrigin({ ...rect, width: 0 }, 1200, "full")).toBeNull();
    expect(lightboxOrigin({ ...rect, height: 0 }, 1200, "full")).toBeNull();
    expect(lightboxOrigin({ ...rect, left: Number.NaN }, 1200, "full")).toBeNull();
    expect(lightboxOrigin(rect, 0, "full")).toBeNull();
  });
});
