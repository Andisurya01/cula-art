import type { ContentFormInput } from "@/features/ai/prompts/content-common";

// Penghubung form detail konten → form versi platform di halaman detail yang sama. Caption & hashtag
// membaca isi detail konten SAAT tombol Buat ditekan (boleh belum disimpan, sesuai Flow 9), tanpa
// membuat form versi platform ikut render ulang setiap kali detail konten diketik.

export type ContentDraftRegistry = {
  /** Dipanggil form detail konten; mengembalikan fungsi pelepas (untuk cleanup effect). */
  register(reader: () => ContentFormInput): () => void;
  /** Isi form detail konten saat ini, atau `null` jika form tidak ada di halaman. */
  read(): ContentFormInput | null;
};

export function createContentDraftRegistry(): ContentDraftRegistry {
  let current: (() => ContentFormInput) | null = null;
  return {
    register(reader) {
      current = reader;
      return () => {
        if (current === reader) current = null;
      };
    },
    read() {
      return current ? current() : null;
    },
  };
}

/** Draf form jika ada, selain itu nilai tersimpan. Judul kosong di draf (sedang diedit) → judul tersimpan. */
export function resolveContentDraft(draft: ContentFormInput | null, saved: ContentFormInput): ContentFormInput {
  if (!draft) return saved;
  return draft.title.trim() ? draft : { ...draft, title: saved.title };
}
