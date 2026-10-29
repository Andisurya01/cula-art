import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { formatProjectDates } from "./format";

describe("formatProjectDates", () => {
  const start = wibToUtc("2026-10-03");
  const end = wibToUtc("2026-11-10");

  it("menampilkan rentang dalam WIB", () => {
    expect(formatProjectDates(start, end)).toBe("3 Okt 2026 – 10 Nov 2026");
  });

  it("hanya mulai atau hanya selesai", () => {
    expect(formatProjectDates(start, null)).toBe("Mulai 3 Okt 2026");
    expect(formatProjectDates(null, end)).toBe("Selesai 10 Nov 2026");
  });

  it("null jika keduanya kosong", () => {
    expect(formatProjectDates(null, null)).toBeNull();
  });
});
