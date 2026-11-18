// Penghubung form Review Mingguan dengan "Draf ringkasan" AI (E9). Fungsi murni, aman di client.

import type { ReviewFormValues } from "./schema";

/** Input fitur `review-draft`: minggu + isi form saat ini (boleh belum disimpan); rencana konten tidak dikirim. */
export function toReviewDraftInput(weekKey: string, values: Pick<ReviewFormValues, "wins" | "repeat" | "stop" | "focusNext">) {
  return {
    weekStart: weekKey,
    wins: values.wins,
    repeat: values.repeat,
    stop: values.stop,
    focusNext: values.focusNext,
  };
}

/** Usulan fokus AI (hasil sementara boleh berisi item kosong) → satu field "Fokus minggu depan", satu per baris. */
export function focusListText(items: readonly (string | null | undefined)[]): string {
  return items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .map((item) => `- ${item}`)
    .join("\n");
}

/** Potongan fokus untuk Riwayat: baris pertama yang berisi, tanpa penanda poin ("- ", "1. "). */
export function focusExcerpt(text: string | null | undefined): string | null {
  const line = text
    ?.split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .find(Boolean);
  return line || null;
}
