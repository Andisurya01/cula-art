import { describe, expect, it } from "vitest";
import {
  buildCsv,
  CSV_BOM,
  csvCell,
  csvDate,
  csvDateTime,
  formatCsvNumber,
  protectFormula,
  toCsv,
  type CsvColumn,
} from "./csv";
import { parseCsv } from "./test-helpers";

describe("toCsv", () => {
  it("BOM UTF-8 di awal, pemisah ;, dan setiap baris diakhiri CRLF", () => {
    const text = toCsv([
      ["Judul", "Jumlah"],
      ["Patung naga", 3],
    ]);
    expect(text.startsWith(CSV_BOM)).toBe(true);
    expect(Buffer.from(text, "utf8").subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(text).toBe("﻿Judul;Jumlah\r\nPatung naga;3\r\n");
    expect(text.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });

  it("data kosong → hanya BOM + header", () => {
    const columns: CsvColumn<{ a: string }>[] = [{ header: "A", value: (r) => r.a }];
    expect(buildCsv(columns, [])).toBe("﻿A\r\n");
    expect(toCsv([])).toBe(CSV_BOM);
  });

  it("huruf non-ASCII tetap utuh", () => {
    expect(parseCsv(toCsv([["Kaligrafi «Ñ» — café ✓"]]))).toEqual([["Kaligrafi «Ñ» — café ✓"]]);
  });
});

describe("csvCell: kutip", () => {
  it.each([
    ["a;b", '"a;b"'],
    ['kata "kunci"', '"kata ""kunci"""'],
    ["baris\nbaru", '"baris\nbaru"'],
    ["baris\r\nbaru", '"baris\r\nbaru"'],
    [" spasi depan", '" spasi depan"'],
    ["spasi belakang ", '"spasi belakang "'],
    ["biasa saja", "biasa saja"],
    ["koma, aman", "koma, aman"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it("bolak-balik lewat parser tetap sama", () => {
    const values = ['a;b', 'x "y" z', "1\n2", "1\r\n2", "  tepi  ", "#hashtag", "https://x.com/a?b=1;c=2"];
    expect(parseCsv(toCsv([values]))).toEqual([values]);
  });

  it("null/undefined → sel kosong; boolean → Ya/Tidak", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(true)).toBe("Ya");
    expect(csvCell(false)).toBe("Tidak");
  });
});

describe("csvCell: angka (desimal koma)", () => {
  it.each([
    [0, "0"],
    [12345, "12345"],
    [1234567, "1234567"],
    [12.5, "12,5"],
    [0.1 + 0.2, "0,3"],
    [-3.25, "-3,25"],
    [-20, "-20"],
    [33.33333333, "33,3333"],
    [-0, "0"],
    [-0.00001, "0"],
  ])("%d → %s", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it("tanpa pemisah ribuan (Excel Indonesia membaca titik sebagai ribuan)", () => {
    expect(formatCsvNumber(1_234_567.5)).toBe("1234567,5");
    expect(formatCsvNumber(1_234_567.5)).not.toContain(".");
  });

  it("NaN dan Infinity → kosong", () => {
    expect(csvCell(Number.NaN)).toBe("");
    expect(csvCell(Number.POSITIVE_INFINITY)).toBe("");
    expect(csvCell(Number.NEGATIVE_INFINITY)).toBe("");
  });

  it("angka negatif tidak diberi awalan anti-formula", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(-1.5)).toBe("-1,5");
  });
});

describe("csvCell: perlindungan formula", () => {
  it.each([
    ["=1+1", "'=1+1"],
    ['=HYPERLINK("http://x","klik")', `"'=HYPERLINK(""http://x"",""klik"")"`],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\t=1", "'\t=1"],
    ["\r=1", `"'\r=1"`],
    ["  =1", "'  =1"],
    ["-", "'-"],
    ["@andi.art", "'@andi.art"],
  ])("%j → %j", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it("teks berisi bilangan biasa tidak diubah", () => {
    expect(protectFormula("-12")).toBe("-12");
    expect(protectFormula("-1,5")).toBe("-1,5");
    expect(protectFormula("+62")).toBe("+62");
  });

  it("karakter berbahaya di tengah teks aman", () => {
    expect(csvCell("Skor = 2x")).toBe("Skor = 2x");
    expect(csvCell("a-b")).toBe("a-b");
    expect(csvCell("email@contoh.id")).toBe("email@contoh.id");
  });
});

describe("waktu WIB", () => {
  it("yyyy-MM-dd HH:mm dalam WIB, termasuk dekat tengah malam", () => {
    expect(csvDateTime(new Date("2026-11-08T07:30:00Z"))).toBe("2026-11-08 14:30");
    expect(csvDateTime(new Date("2026-11-07T16:59:00Z"))).toBe("2026-11-07 23:59");
    expect(csvDateTime(new Date("2026-11-07T17:00:00Z"))).toBe("2026-11-08 00:00");
    expect(csvDateTime(new Date("2026-12-31T17:05:00Z"))).toBe("2027-01-01 00:05");
  });

  it("tanggal saja (snapshot followers disimpan 00.00 WIB)", () => {
    expect(csvDate(new Date("2026-11-07T17:00:00Z"))).toBe("2026-11-08");
    expect(csvDate(new Date("2026-11-08T16:59:59Z"))).toBe("2026-11-08");
  });

  it("null → kosong", () => {
    expect(csvDateTime(null)).toBeNull();
    expect(csvDate(undefined)).toBeNull();
    expect(csvCell(csvDateTime(null))).toBe("");
  });
});
