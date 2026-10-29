import { z } from "zod";

// Helper field yang idempoten: menerima nilai mentah dari form (string kosong) maupun
// nilai yang sudah ditransformasi (null/number), sehingga schema yang sama aman di-parse
// di client (zodResolver) dan di server (Server Action).

/** Teks opsional: string kosong / spasi → `null`. */
export function nullableText(max: number, label: string) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`).nullable());
}

/** Bilangan bulat opsional dari `<input type="number">`: string kosong → `null`. */
export function nullableInt(min: number, max: number, label: string) {
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "number") return v;
      const trimmed = v.trim();
      return trimmed === "" ? null : Number(trimmed);
    })
    .pipe(
      z
        .number({ error: `${label} harus berupa angka` })
        .int(`${label} harus bilangan bulat`)
        .min(min, `${label} minimal ${min}`)
        .max(max, `${label} maksimal ${max}`)
        .nullable(),
    );
}

/** ID relasi opsional (Select memakai sentinel di UI, dikirim sebagai `null`). */
export const nullableId = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v : null));
