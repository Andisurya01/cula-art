# Galeri & Studio Karya

_Nama sementara; sebelumnya Content Growth Planner._ Satu web app di satu domain: **Galeri** publik untuk memamerkan (dan nanti menjual) karya gambar dan patung clay, dan **Studio** privat (wajib login) untuk merencanakan, memproduksi, dan mengevaluasi konten TikTok/Instagram. Spesifikasi lengkap ada di [docs/PRD.md](docs/PRD.md).

## Status

| Fase | Isi | Status |
| --- | --- | --- |
| 1. Fondasi | Pengaturan, Bank Ide, Pipeline + detail konten, Kalender, Proyek & Seri, Beranda ringkas | Selesai 28 Okt 2026 ([docs/FASE-1.md](docs/FASE-1.md)) |
| 2. Galeri + Auth | Studio di `/studio` + login 2FA, menu Karya + unggah foto, Galeri publik (Beranda, Katalog, Detail, Tentang), SEO | Selesai 29 Okt 2026, deploy menunggu domain + VPS ([docs/FASE-2.md](docs/FASE-2.md), [docs/DEPLOY.md](docs/DEPLOY.md)) |
| 3. Asisten AI | Panduan AI, draf ide/hook/script/caption, teks karya dari foto, batas biaya + log | Belum |
| 4. Data | Postingan, metrik H+1/H+7, snapshot followers, Analitik, Beranda Studio penuh | Belum |
| 5. Saran + AI analisis | Mesin aturan, Eksperimen, Review Mingguan (+ draf AI), PWA offline, ekspor/backup | Belum |
| 6. Toko | Keranjang, checkout, pembayaran, ongkir, pesanan | Belum |

## Kebutuhan

- Windows + PowerShell (script juga jalan di macOS/Linux)
- Node.js 20 atau lebih baru (server produksi: Node 24 LTS), npm
- PostgreSQL 18

## Setup pertama kali

1. Database lokal (sekali). Di PostgreSQL buat role `galeri` (LOGIN, CREATEDB) dan dua database milik role itu: `galeri_dev` (aplikasi) dan `galeri_test` (test integrasi).
2. Salin `.env.example` ke `.env`, isi password role `galeri`. `.env` tidak di-commit.

   | Variabel | Isi |
   | --- | --- |
   | `DATABASE_URL` | `galeri_dev` |
   | `DATABASE_URL_TEST` | `galeri_test` (nama wajib berakhiran `_test`; tabelnya dikosongkan setiap test) |
   | `UPLOAD_DIR` | folder foto unggahan, default `./uploads` (relatif ke folder tempat server dijalankan; pakai path absolut jika ragu) |
   | `SITE_URL` | URL publik tanpa `/` di akhir (sitemap, Open Graph, tautan WhatsApp) |

3. Lalu:

   ```powershell
   cd "C:UsersandisDocumentsepo eksperimencontent planner"
   npm install                 # juga menjalankan prisma generate
   npx prisma migrate deploy   # semua migrasi ke galeri_dev
   npx prisma db seed          # pilar, format, hook, checklist, pengaturan default (aman diulang)
   npm run admin:create        # akun pemilik (email + password min. 12 karakter)
   npm run dev                 # http://localhost:3000
   ```

4. Buka `http://localhost:3000/masuk`, login, pindai QR dengan aplikasi authenticator, simpan 10 kode pemulihan. Studio ada di `/studio`, Galeri publik di `/`.

Data contoh Galeri (opsional): `npx tsx scripts/demo-gallery.ts` (hapus lagi dengan `--hapus`).

## Script

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server development |
| `npm run build` / `npm start` | Build dan jalankan versi produksi (`npm start` membaca `PORT`; build butuh database jalan) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest: unit + integrasi ke `galeri_test` (migrasi otomatis); `npm run test:watch` untuk mode watch |
| `npm run admin:create` | Buat akun pemilik (sekali) |
| `npm run admin:reset-2fa` | Darurat: HP hilang dan kode pemulihan habis; semua sesi dicabut |
| `npm run admin:reset-password` | Darurat: lupa password; semua sesi dicabut |

Satu fitur dianggap selesai jika `lint`, `typecheck`, `test`, dan `build` lolos. Deploy ke VPS: [docs/DEPLOY.md](docs/DEPLOY.md).

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`) · TypeScript strict · Prisma 6 + PostgreSQL 18 · Tailwind 4 + Shadcn/ui · TanStack Query · React Hook Form + Zod · Zustand · dnd-kit · date-fns + date-fns-tz · sharp · qrcode · Vitest 4.

## Struktur

```
src/proxy.ts                    cek cepat cookie sesi untuk /studio/*
src/app/(galeri)/               Galeri publik: Beranda, karya/, karya/[slug]/, tentang/ (+ opengraph-image)
src/app/masuk/                  login Studio (password → kode 2FA)
src/app/studio/(app)/<menu>/    Studio: beranda (/studio), ide, pipeline, kalender, proyek, karya, postingan, analitik, eksperimen, review, pengaturan
src/app/media/[...key]/         penyaji foto unggahan; src/app/api/health/ cek hidup
src/features/<domain>/          components/, actions.ts (Server Actions, diawali requireAdmin), schema.ts (Zod), queries.ts
src/features/auth/              sesi, TOTP, password, lockout, requireAdmin (dal.ts)
src/features/gallery/           satu-satunya pintu data Galeri (queries.ts → DTO publik), teks Galeri (copy.ts)
src/lib/                        routes.ts (semua path), storage.ts + images.ts (unggah, sharp), slug.ts, date.ts (WIB), db.ts
src/lib/analytics/              fungsi murni metrik (ER, skor, skor relatif) + unit test
src/test/                       helper test (database test, mock next/headers)
prisma/                         schema.prisma, migrations/, seed.ts
scripts/                        admin-*.ts, demo-gallery.ts
deploy/                         Caddyfile, galeri.service, galeri-backup.sh
docs/                           PRD, rencana fase, DEPLOY
```

## Catatan

- Semua waktu disimpan UTC dan ditampilkan dalam WIB.
- Tombol **+ Ide** ada di semua halaman Studio; di desktop tekan `N` (saat tidak sedang mengetik).
- Metrik TikTok dan Instagram tidak pernah dicampur dalam satu agregat.
- Galeri hanya menampilkan karya Terbit; harga hanya jika "Tampilkan harga" aktif. Foto unggahan diproses ulang tanpa metadata EXIF/GPS.
