import { describe, expect, it } from "vitest";
import { MAX_COUNT, parseCount, parsePercent, parseWatchSeconds, withCountSuffix } from "./parse-count";

describe("withCountSuffix", () => {
  it.each([
    ["12,3", "K", "12,3K"],
    [" 12,3 ", "K", "12,3K"],
    ["12,3K", "jt", "12,3jt"],
    ["1,2 rb", "K", "1,2K"],
    ["1,2 juta", "K", "1,2K"],
    ["", "K", ""],
    ["   ", "jt", ""],
  ])("%s + %s → %s", (text, suffix, expected) => {
    expect(withCountSuffix(text, suffix)).toBe(expected);
  });

  it("hasilnya terbaca parseCount", () => {
    expect(parseCount(withCountSuffix("12,3", "K"))).toBe(12300);
    expect(parseCount(withCountSuffix("1,2", "jt"))).toBe(1200000);
  });
});

describe("parseCount", () => {
  it.each([
    ["0", 0],
    ["7", 7],
    ["007", 7],
    ["1234", 1234],
    ["12.345", 12345],
    ["12,345", 12345],
    ["1.234.567", 1234567],
    ["1,234,567", 1234567],
    ["1.234,00", 1234],
    ["12,0", 12],
    [" 12 345 ", 12345],
    ["12 345", 12345],
  ])("angka biasa %s → %d", (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });

  it.each([
    ["12,3K", 12300],
    ["12.3K", 12300],
    ["12,3k", 12300],
    ["12K", 12000],
    ["12 K", 12000],
    ["1,2rb", 1200],
    ["1.2rb", 1200],
    ["1,2 rb", 1200],
    ["12rb", 12000],
    ["1,2 ribu", 1200],
    ["1,2jt", 1200000],
    ["1.2jt", 1200000],
    ["1,2 juta", 1200000],
    ["3 juta", 3000000],
    ["1.2M", 1200000],
    ["1,5m", 1500000],
    ["12.345K", 12345],
    ["1.234,5K", 1234500],
    ["0,001K", 1],
  ])("format aplikasi %s → %d", (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });

  it("tidak terkena galat pembulatan float", () => {
    expect(parseCount("1,1K")).toBe(1100);
    expect(parseCount("4,35K")).toBe(4350);
    expect(parseCount("2,3jt")).toBe(2300000);
  });

  it.each([
    ["kosong", ""],
    ["spasi", "   "],
    ["huruf", "abc"],
    ["negatif", "-5"],
    ["desimal tanpa akhiran", "12,3"],
    ["desimal titik tanpa akhiran", "1.5"],
    ["pengelompokan salah", "1.23.456"],
    ["pemisah ganda", "1..2"],
    ["akhiran tak dikenal", "12B"],
    ["akhiran saja", "K"],
    ["lebih dari batas", "3M0"],
    ["campuran pemisah salah", "1,2.3"],
  ])("menolak %s", (_name, input) => {
    expect(parseCount(input)).toBeNull();
  });

  it("menolak angka di atas batas database", () => {
    expect(parseCount(String(MAX_COUNT))).toBe(MAX_COUNT);
    expect(parseCount(String(MAX_COUNT + 1))).toBeNull();
    expect(parseCount("9999juta")).toBeNull();
  });
});

describe("parsePercent", () => {
  it.each([
    ["45", 45],
    ["45,5", 45.5],
    ["45.5", 45.5],
    ["45,5%", 45.5],
    ["45,5 %", 45.5],
    ["0", 0],
  ])("%s → %d", (input, expected) => {
    expect(parsePercent(input)).toBe(expected);
  });

  it.each(["", "abc", "-1", "4,5,6"])("menolak %s", (input) => {
    expect(parsePercent(input)).toBeNull();
  });
});

describe("parseWatchSeconds", () => {
  it.each([
    ["8", 8],
    ["8,3", 8.3],
    ["8.3", 8.3],
    ["8.3s", 8.3],
    ["8,3 dtk", 8.3],
    ["8 detik", 8],
    ["12sec", 12],
    ["1:23", 83],
    ["0:07", 7],
  ])("%s → %d", (input, expected) => {
    expect(parseWatchSeconds(input)).toBe(expected);
  });

  it.each(["", "abc", "-1", "1:75", "1:2:3"])("menolak %s", (input) => {
    expect(parseWatchSeconds(input)).toBeNull();
  });
});
