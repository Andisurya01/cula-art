# Fase 1: Fondasi

Status: selesai 28 Oktober 2026. Lint, typecheck, 104 unit test, dan build lolos; alur inti diuji manual di browser (desktop dan 375 px).

## Prompt pembuka untuk Claude Code

Jalankan `claude` di folder proyek, lalu kirim:

```
Baca CLAUDE.md, docs/PRD.md, dan docs/FASE-1.md sampai habis. Kerjakan Fase 1 sesuai checklist di docs/FASE-1.md.
Urutan: langkah 1-4 kamu kerjakan sendiri. Setelah itu pakai subagent paralel untuk langkah 5-9 (satu agent per menu, masing-masing hanya menyentuh folder fitur dan route-nya sendiri). Terakhir jalankan langkah 10 dan centang checklist di file ini.
Tanyakan dulu jika ada keputusan yang mengubah PRD.
```

## Checklist

### Fondasi (sesi utama)

- [x] **1. Scaffold.** `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`, npm) di folder ini tanpa menghapus `CLAUDE.md` dan `docs/`. Init Shadcn/ui. Pasang: Prisma, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, zustand, @dnd-kit/core, @dnd-kit/sortable, date-fns, date-fns-tz, lucide-react, next-themes, vitest, tsx. Tambah script `test` (`vitest run`) dan `typecheck` (`tsc --noEmit`).
- [x] **2. Schema Prisma.** Semua entitas di PRD bagian Model data (termasuk yang baru dipakai di Fase 2/3), enum, relasi, unique constraint, `createdAt`/`updatedAt`. Tambah `ChecklistTemplateItem` (label, order, isActive) supaya checklist default bisa diubah di Pengaturan. Buat migrasi awal.
- [x] **3. Seed idempoten** (`prisma/seed.ts` via `tsx`, upsert): 5 pilar dengan warna dan porsi 30/30/15/15/10, 6 format, 6 tipe hook, 7 item checklist, satu baris Setting (target 3 post/minggu, slot Selasa/Kamis/Sabtu 19.00 WIB, bobot skor default dari PRD).
- [x] **4. Lib + layout.**
  - `src/lib/db.ts`, `src/lib/date.ts` (awal minggu Senin di Asia/Jakarta, format locale `id`, konversi tanggal+jam WIB ke UTC) + unit test.
  - `src/lib/analytics/metrics.ts`: ER, save rate, share rate, follow rate, skor konten (bobot), skor relatif (median 10 post terakhir), `views = 0` → 0 + unit test.
  - Layout: sidebar 10 menu (desktop), bottom nav Beranda / Pipeline / + Ide / Kalender / Lainnya (HP < 768 px), dialog + Ide global (FAB di HP, shortcut `N` di desktop saat tidak mengetik), toggle terang/gelap, `/` redirect ke `/beranda`, provider TanStack Query.

### Fitur (boleh paralel dengan subagent)

- [x] **5. Pengaturan** `/pengaturan`: kelola pilar (nama, deskripsi, warna, porsi, nonaktifkan jika dipakai), format, tipe hook, item checklist (urutkan, nonaktifkan), target mingguan, slot posting (hari + jam), handle TikTok/IG, bobot skor.
- [x] **6. Bank Ide** `/ide`: tambah cepat (judul saja) dan form lengkap (pilar, medium Gambar/Clay/Campuran, catatan, link, potensi 1-5, effort 1-5); filter pilar/medium/status; urut terbaru atau skor gabungan; edit, arsipkan; aksi Jadikan Konten (buat Content di PLANNING + checklist dari template, ide jadi PICKED, buka detail konten); banner "bank ide menipis" jika ide Baru < 5.
- [x] **7. Pipeline** `/pipeline` + detail `/pipeline/[id]`:
  - Kanban 5 kolom dengan dnd-kit, optimistic update + rollback; kartu berisi judul, warna pilar, format, jadwal, ikon platform, nomor part, badge "macet" (> 7 hari di kolom yang sama).
  - Di HP kanban menjadi tab per kolom, dengan pilihan stage di kartu.
  - Pindah ke Posted membuka dialog yang mewajibkan URL + waktu posting untuk minimal satu versi platform (divalidasi juga di server).
  - Detail konten: semua field konten, checklist, versi platform (Post TikTok/IG: tipe, caption, hashtag, jadwal WIB, URL, waktu posting), hapus dengan konfirmasi.
- [x] **8. Kalender** `/kalender`: tampilan minggu (default, mulai Senin) dan bulan, navigasi sebelumnya/berikutnya/hari ini; post berwarna pilar; slot kosong dari Setting sebagai kotak putus-putus (warna peringatan jika sudah lewat atau ≤ 2 hari lagi); daftar Siap Posting yang bisa di-drag ke slot, plus tombol Jadwalkan sebagai alternatif tanpa drag.
- [x] **9. Proyek & Seri** `/proyek` + detail: CRUD proyek (judul, medium, tahap, tanggal mulai/selesai, catatan); konten proyek urut part; foto progres via URL + caption + tanggal (tanpa upload file di Fase 1); dialog Buat Seri (1-12 part, judul dasar, pilar, format → "Judul — Part i" di PLANNING beserta checklist).
- [x] **Placeholder** untuk Postingan, Analitik, Eksperimen, Review Mingguan (empty state yang menjelaskan isi Fase 2/3). Beranda Fase 1: jumlah post terjadwal minggu ini vs target, jumlah konten per stage, konten macet, peringatan bank ide.

### Penutup (sesi utama)

- [x] **10. Verifikasi dan dokumentasi.**
  - DB baru: migrasi + seed berhasil di database kosong terpisah (`prisma migrate deploy` + seed dua kali, idempoten). `migrate reset` pada `dev.db` butuh persetujuan eksplisit pengguna dan tidak dijalankan.
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos.
  - Uji manual alur inti di `npm run dev`: tambah ide → Jadikan Konten → pindah stage → tambah versi TikTok terjadwal → tampil di Kalender. Cek tiap halaman di lebar 375 px.
  - `.gitignore` mengecualikan `node_modules`, `.next`, `*.db`, `*.db-journal`, `.env*.local`. Sediakan `.env.example` dan `.env` berisi `DATABASE_URL="file:./dev.db"`.
  - `README.md` berbahasa Indonesia (setup Windows, script, struktur, status fase). Perbarui bagian Perintah di `CLAUDE.md`.
  - `git init` sudah; commit pertama dilakukan pengguna secara manual.

## Catatan

- Jika versi mayor terbaru Prisma membuat setup SQLite repot (misalnya wajib driver adapter atau config terpisah), boleh memakai Prisma 6.x terbaru.
- Recharts dan Serwist belum dipasang di Fase 1.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis eksplisit di PRD (PRD bagian "Aturan data" sudah diperbarui untuk yang menyangkut data):

- **Versi:** Next.js 16.4 (`cacheComponents` dimatikan, layout `(app)` memakai `force-dynamic`), Prisma 6.19, Vitest 4 (Vitest 5 butuh Node 22).
- **Satu Post per platform per konten** (`@@unique([contentId, platform])`). Tipe post: TikTok = Video/Carousel/Story, Instagram = Reel/Carousel/Story.
- **Format dan tipe hook** boleh kosong selama Perencanaan–Editing, wajib saat pindah ke Siap Posting atau Posted (dicek di server).
- **Post per minggu** (Beranda, slot Kalender) dihitung per konten, bukan per platform.
- **Slot Kalender terisi** jika ada post pada tanggal WIB yang sama dengan jam ±2 jam dari slot. Slot kosong yang lewat = merah, ≤ 2 hari lagi = kuning.
- **Penjadwalan dari Kalender** memakai platform yang sudah punya versi; konten tanpa versi default TikTok + Instagram. Post yang sudah diposting tidak diubah.
- **Pindah ke Posted** menolak waktu posting > 10 menit di masa depan. Konten Posted tidak bisa kehilangan versi terakhir yang punya URL + waktu posting.
- **Hapus konten** mengembalikan ide asal ke Baru hanya jika statusnya Dipilih. Ide yang diarsipkan harus dikembalikan dulu sebelum Jadikan Konten.
- **Pilar/Format/Hook** dilindungi juga di database (`onDelete: Restrict`, migrasi `restrict_taxonomy_delete`). Minimal satu pilar harus aktif.
- **Tahap proyek:** Rencana, Berjalan, Selesai, Ditunda.
- **Filter** Bank Ide (`?pillar&medium&status&sort`), Kalender (`?view&date`), dan Proyek (`?tahap`) disimpan di URL.
- **Skor gabungan ide** = potensi × (6 − effort), rentang 1–25; ide tanpa nilai diurut paling bawah.
- **Server Action dari client** dipanggil lewat `callAction` (`src/lib/action-client.ts`): request gagal → toast, input form tetap ada. `src/app/(app)/error.tsx` menangkap error halaman.

Belum dikerjakan (di luar checklist Fase 1): foto referensi ide (upload), blok waktu hari produksi di Kalender, jadwal input metrik H+1/H+7 saat Posted (Fase 2), memindah/membatalkan jadwal langsung dari Kalender (lewat detail konten), keyboard drag di Kalender (pakai tombol Jadwalkan).
