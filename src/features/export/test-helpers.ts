// Hanya untuk test ekspor: parser CSV ketat (pemisah `;`, baris CRLF, kutip ganda RFC 4180) supaya
// isi file bisa diperiksa bolak-balik. Melempar error untuk bentuk yang tidak dihasilkan csv.ts.

export function parseCsv(text: string): string[][] {
  const src = text.startsWith("﻿") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let wasQuoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (src[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
      continue;
    }
    if (ch === '"') {
      if (field !== "" || wasQuoted) throw new Error(`kutip di tengah sel (posisi ${i})`);
      quoted = true;
      wasQuoted = true;
    } else if (ch === ";") {
      row.push(field);
      field = "";
      wasQuoted = false;
    } else if (ch === "\r" && src[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      wasQuoted = false;
      i++;
    } else if (ch === "\r" || ch === "\n") {
      throw new Error(`baris baru tanpa CRLF di luar kutip (posisi ${i})`);
    } else {
      if (wasQuoted) throw new Error(`teks setelah kutip penutup (posisi ${i})`);
      field += ch;
    }
  }
  if (quoted) throw new Error("kutip tidak ditutup");
  if (field !== "" || row.length > 0) throw new Error("baris terakhir tidak diakhiri CRLF");
  return rows;
}

/** Baris data sebagai objek header → nilai; setiap baris wajib selebar header. */
export function csvRecords(text: string): Record<string, string>[] {
  const [header = [], ...rows] = parseCsv(text);
  return rows.map((row, index) => {
    if (row.length !== header.length) {
      throw new Error(`baris ${index + 2}: ${row.length} kolom, header ${header.length}`);
    }
    return Object.fromEntries(header.map((name, i) => [name, row[i]!]));
  });
}

export function csvHeader(text: string): string[] {
  return parseCsv(text)[0] ?? [];
}
