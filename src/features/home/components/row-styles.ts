// Baris daftar di kartu Beranda (gaya referensi Studio): kartu bertingkat abu di dalam kartu putih,
// tanpa garis pemisah. Hover sedikit mendekati warna teks (sama dengan tombol sekunder).

/** Daftar baris: jarak antarbaris, bukan garis. */
export const ROW_LIST = "grid gap-2";

/** Baris statis (isi bukan satu tautan penuh). */
export const ROW = "rounded-card-nested bg-muted px-4 py-3 text-sm";

/** Baris yang seluruhnya tautan. */
export const ROW_LINK =
  "rounded-card-nested bg-muted px-4 py-3 text-sm transition-colors outline-hidden hover:bg-[color-mix(in_srgb,var(--muted),var(--foreground)_6%)] focus-visible:ring-3 focus-visible:ring-ring";

/** Pengingat (Alert) di grid Beranda: bentuk dan garis sama dengan kartu di sebelahnya. */
export const HOME_ALERT = "rounded-card border-0 px-5 py-4 ring-1 ring-border/70";
