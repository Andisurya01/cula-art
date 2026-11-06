// Fungsi murni: angka seperti yang ditampilkan aplikasi TikTok/Instagram → number.
// Aman dipakai di client dan server.

/** Batas `Int` PostgreSQL dibulatkan ke bawah, supaya angka salah ketik ditolak dengan pesan biasa. */
export const MAX_COUNT = 2_000_000_000;

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  m: 1_000_000,
  jt: 1_000_000,
  juta: 1_000_000,
};

const COUNT_PATTERN = /^([\d.,]+)(k|rb|ribu|m|jt|juta)?$/;

function stripSpaces(value: string): string {
  return value.replace(/[\s  ]/g, "");
}

/** `12.345` / `12,345` / `1.234.567`: pemisah ribuan, bukan desimal. */
const GROUPED = /^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/;
/** `1.234,5` / `1,234.5`: pemisah ribuan + desimal (yang terakhir). */
const GROUPED_DECIMAL = /^\d{1,3}(?:(?:\.\d{3})+,\d+|(?:,\d{3})+\.\d+)$/;
const SIMPLE = /^\d+(?:[.,]\d+)?$/;

/** Angka tanpa akhiran: `12.345` berarti dua belas ribu, `12,3` berarti desimal. */
function parseNumberPart(text: string, hasSuffix: boolean): number | null {
  if (!hasSuffix && GROUPED.test(text)) return Number(text.replace(/[.,]/g, ""));
  if (GROUPED_DECIMAL.test(text)) {
    const decimalAt = Math.max(text.lastIndexOf("."), text.lastIndexOf(","));
    return Number(`${text.slice(0, decimalAt).replace(/[.,]/g, "")}.${text.slice(decimalAt + 1)}`);
  }
  // Dengan akhiran, `1.234.567K` tetap pengelompokan ribuan.
  if (hasSuffix && GROUPED.test(text) && /[.,].*[.,]/.test(text)) {
    return Number(text.replace(/[.,]/g, ""));
  }
  if (SIMPLE.test(text)) return Number(text.replace(",", "."));
  return null;
}

/**
 * Jumlah (views, likes, followers, …): bilangan bulat ≥ 0. Menerima format aplikasi:
 * `12.345`, `12,345`, `12,3K`, `12.3k`, `1,2rb`, `1,2 ribu`, `1,2jt`, `1,2 juta`, `1.2M`.
 * Mengembalikan `null` jika kosong atau tidak bisa dibaca sebagai bilangan bulat ≥ 0
 * (mis. `12,3` tanpa akhiran, `-5`, `abc`). `M` berarti juta, sesuai aplikasi berbahasa Inggris.
 */
export function parseCount(input: string): number | null {
  const match = COUNT_PATTERN.exec(stripSpaces(input).toLowerCase());
  if (!match) return null;
  const [, numberPart, suffix] = match;

  const value = parseNumberPart(numberPart, Boolean(suffix));
  if (value === null || !Number.isFinite(value)) return null;

  const scaled = suffix ? Math.round(value * MULTIPLIERS[suffix]) : value;
  if (!Number.isInteger(scaled) || scaled < 0 || scaled > MAX_COUNT) return null;
  return scaled;
}

/** Pasang atau ganti akhiran: `12,3` + `K` → `12,3K`; `12,3K` + `jt` → `12,3jt`. Kosong tetap kosong. */
export function withCountSuffix(text: string, suffix: string): string {
  const value = text.trim().replace(/\s*(?:k|rb|ribu|m|jt|juta)$/i, "");
  return value === "" ? "" : `${value}${suffix}`;
}

/** Desimal ≥ 0 dengan koma atau titik, boleh berakhiran `%`. Kosong atau tidak valid → `null`. */
export function parsePercent(input: string): number | null {
  const text = stripSpaces(input).replace(/%$/, "");
  if (!SIMPLE.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/**
 * Waktu tonton dalam detik: `8,3`, `8.3s`, `8,3 dtk`, `8 detik`, atau menit:detik seperti `1:23`.
 * Kosong atau tidak valid → `null`.
 */
export function parseWatchSeconds(input: string): number | null {
  const text = stripSpaces(input).toLowerCase();
  const clock = /^(\d+):([0-5]\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const number = text.replace(/(?:s|sec|dtk|detik)$/, "");
  if (!SIMPLE.test(number)) return null;
  const value = Number(number.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
