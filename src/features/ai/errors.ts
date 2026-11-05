import Anthropic from "@anthropic-ai/sdk";

// Error SDK → pesan bahasa Indonesia untuk toast. Dicek dengan kelas error bertipe, bukan mencocokkan teks.

export const AI_MESSAGES = {
  disabled: "Asisten AI nonaktif. Nyalakan di Pengaturan → Panduan AI.",
  noKey: "Kunci API Anthropic belum terpasang di server (ANTHROPIC_API_KEY).",
  dailyLimit: (limit: number) => `Batas ${limit} panggilan AI hari ini sudah tercapai. Coba lagi besok atau naikkan batasnya di Pengaturan.`,
  monthlyBudget: (budget: number) =>
    `Biaya AI bulan ini sudah mencapai batas US$${budget}. Naikkan batasnya di Pengaturan jika perlu.`,
  refused: "Permintaan ditolak oleh pengaman model AI. Ubah instruksi atau isi form, lalu coba lagi.",
  truncated: "Hasil AI terlalu panjang dan terpotong. Coba lagi, atau beri instruksi \"lebih singkat\".",
  invalidOutput: "Hasil AI tidak sesuai format yang diharapkan. Coba lagi.",
  aborted: "Dibatalkan.",
  badInput: "Data permintaan tidak valid.",
  unknownFeature: "Fitur AI tidak dikenal.",
} as const;

export function aiErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIUserAbortError) return AI_MESSAGES.aborted;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "Permintaan ke AI terlalu lama. Coba lagi.";
  if (error instanceof Anthropic.APIConnectionError) return "Gagal terhubung ke layanan AI. Periksa koneksi lalu coba lagi.";
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "Kunci API Anthropic ditolak. Periksa ANTHROPIC_API_KEY di server.";
  }
  if (error instanceof Anthropic.NotFoundError) return "Model AI yang dipilih tidak tersedia untuk akun ini. Ganti model di Pengaturan.";
  if (error instanceof Anthropic.RateLimitError) return "Batas permintaan Anthropic tercapai. Coba lagi sebentar lagi.";
  if (error instanceof Anthropic.InternalServerError) return "Layanan AI sedang sibuk atau bermasalah. Coba lagi beberapa saat lagi.";
  if (error instanceof Anthropic.BadRequestError) {
    // Pesan API (mis. saldo kredit habis) tidak memuat kunci; dipotong supaya toast tetap ringkas.
    return `Permintaan ke AI ditolak: ${error.message.slice(0, 200)}`;
  }
  if (error instanceof Anthropic.APIError) return `Layanan AI mengembalikan error${error.status ? ` ${error.status}` : ""}. Coba lagi.`;
  return "Terjadi kesalahan saat memanggil AI. Coba lagi.";
}
