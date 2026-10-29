# Galeri & Studio Karya (nama sementara; dulu Content Growth Planner)

Satu web app, satu domain, dua sisi:

- **Galeri** (publik, `/`): etalase karya gambar dan patung clay ala katalog marketplace. Nanti menjadi toko.
- **Studio** (privat, `/studio`, wajib login): content planner untuk konten TikTok/Instagram (target 2-3 post per minggu, keputusan berbasis data) plus pengelolaan karya yang tampil di Galeri.

Spesifikasi lengkap ada di `docs/PRD.md`. Baca PRD sebelum mengerjakan fitur baru; jika implementasi menyimpang dari PRD, tanyakan dulu atau perbarui PRD di commit yang sama. Fase 1 (selesai) ada di `docs/FASE-1.md`; rencana Fase 2 ada di `docs/FASE-2.md`.

> Status kode (29 Okt 2026): Fase 2 selesai (Galeri publik, Studio di `/studio` dengan login + 2FA, menu Karya, unggah foto). Deploy ke VPS menunggu domain + VPS; panduan di `docs/DEPLOY.md`. Keputusan implementasi di akhir `docs/FASE-2.md`.

## Lingkungan

- Dikembangkan dan dijalankan lokal di Windows (PowerShell). Semua npm script harus lintas platform: tanpa `rm -rf`, tanpa `FOO=1 cmd`, tanpa path absolut. Pakai paket seperti `rimraf` atau `cross-env` jika perlu.
- Path folder proyek mengandung spasi (`repo eksperimen\content planner`): selalu beri tanda kutip pada path di perintah shell.
- Package manager: npm. Node 20 atau lebih baru.
- Database: PostgreSQL 18 lokal, role `galeri`, database `galeri_dev` (aplikasi) dan `galeri_test` (test integrasi). `.env` berisi password dan **tidak di-commit**; contoh nilai di `.env.example` (`DATABASE_URL`, `DATABASE_URL_TEST`, `UPLOAD_DIR`, `SITE_URL`).
- PostgreSQL di laptop ini bukan service Windows: cluster `C:Usersandispgdata-kce` (dipakai bersama proyek lain). Jika mati, jalankan dari PowerShell `Start-Process pg_ctl.exe -ArgumentList start,-D,C:/Users/andis/pgdata-kce,-l,C:/Users/andis/pgdata-kce/server.log -WindowStyle Hidden` (jangan dari Bash), lalu tunggu `pg_isready`.
- File unggahan di `UPLOAD_DIR` (default `./uploads`, di-gitignore). Path relatif mengikuti **cwd proses**, bukan folder proyek: preview pane (`next start <folder>` dari folder home) butuh path absolut di `.env` lokal. Test memakai `.test-uploads/<pid>`.
- Preview pane: konfigurasi `content-planner` di `C:Usersandis.claudelaunch.json` menjalankan `next start -p 3100`, jadi `npm run build` dulu; hentikan preview sebelum `prisma generate`/`migrate` (Windows mengunci DLL engine). Pane sering tidak menggambar: kendalikan lewat `javascript_tool`/`form_input`.

## Stack

- Next.js App Router + TypeScript (strict)
- Prisma 6 + PostgreSQL (dev, test, produksi)
- Shadcn/ui + Tailwind
- TanStack Query (optimistic update untuk kanban dan kalender)
- React Hook Form + Zod (schema yang sama dipakai di client dan Server Actions)
- Zustand hanya untuk state UI (filter, tampilan kalender, drag state)
- dnd-kit, date-fns + date-fns-tz, lucide-react, next-themes, Vitest
- sharp (gambar), qrcode (QR setup 2FA). Fase 3: `@anthropic-ai/sdk` (Asisten AI). Fase 4+: Recharts. Fase 5: Serwist (PWA, hanya Studio)

## Struktur

```
src/proxy.ts                     # cek cepat cookie sesi untuk /studio/* → /masuk?next=
src/app/(galeri)/                # Galeri publik: layout, page (/), karya/, karya/[slug]/, tentang/
src/app/masuk/                   # login Studio (password → 2FA)
src/app/studio/(app)/<menu>/     # Studio: page.tsx = /studio; ide, pipeline, kalender, proyek, karya, postingan, analitik, eksperimen, review, pengaturan
src/app/media/[...key]/route.ts  # penyaji file unggahan (publik, cache immutable)
src/app/sitemap.ts, robots.ts
src/features/<domain>/           # components/, actions.ts, schema.ts, queries.ts
src/features/auth/               # dal.ts (requireAdmin), session, totp, password, login-actions.ts
src/features/gallery/            # queries.ts (satu-satunya pintu data Galeri), dto.ts, copy.ts (teks Galeri), format.ts, catalog.ts, revalidate.ts
src/lib/routes.ts                # SEMUA path internal (href, router.push, redirect, revalidatePath)
src/lib/storage.ts, images.ts    # simpan/baca/hapus file; sharp (resize 2400, WebP 82, tanpa EXIF)
src/lib/upload-route.ts          # helper Route Handler unggah (server); upload-client.ts = XHR + progres (client)
src/lib/slug.ts, site.ts         # slugify + slug unik; SITE_URL/absoluteUrl
src/lib/analytics/               # metrics.ts, grouping.ts, rules.ts  (fungsi murni, tanpa Prisma/React)
src/lib/date.ts                  # helper minggu & WIB
src/lib/db.ts                    # Prisma client singleton
src/test/                        # helper test: db.ts (resetDatabase), next-headers.ts (mock), global-setup.ts
prisma/schema.prisma, prisma/seed.ts, scripts/admin-*.ts
```

## Aturan kode

- Halaman = Server Component yang memanggil `queries.ts`. Mutasi = Server Actions yang selalu memvalidasi input dengan Zod, lalu `revalidatePath`.
- `src/lib/analytics/*` adalah fungsi murni: input data mentah, output angka/saran. Tidak boleh import Prisma, React, atau Next. Setiap fungsi wajib punya unit test Vitest, termasuk `views = 0` (rate = 0, bukan NaN) dan data kosong.
- Metrik hanya dibandingkan dalam platform yang sama. Jangan pernah mencampur views TikTok dan reach Instagram dalam satu agregat.
- Aturan saran hanya aktif jika grup punya minimal 3 post.
- Waktu disimpan UTC, ditampilkan dan dihitung (minggu, hari, jam posting) dalam `Asia/Jakarta`. Minggu dimulai Senin.
- Pillar, Format, HookType tidak dihapus jika sudah dipakai; set `isActive = false`.
- Teks UI dalam bahasa Indonesia; istilah platform (views, saves, hook, caption) tetap bahasa Inggris. Nama variabel, fungsi, dan kolom database dalam bahasa Inggris.
- Mobile-first: setiap halaman harus nyaman di lebar 375 px. Tombol + Ide tersedia di semua halaman Studio.
- Path internal selalu dari `src/lib/routes.ts` (`routes.studio.*`, `routes.gallery.*`, `routePatterns.*` untuk `revalidatePath(pattern, "page")`), bukan string tersebar.
- Hindari `any`. Komponen dibuat kecil dan per fitur.
- Jangan menambah integrasi pihak ketiga atau API eksternal sebelum fase Toko, kecuali Claude API untuk Asisten AI (Fase 3). Tautan biasa ke TikTok/Instagram/WhatsApp boleh.

## Perintah

```
npm install                 # + prisma generate (postinstall)
npx prisma migrate dev      # migrasi + generate; tambahkan --name <nama> untuk migrasi baru
npx prisma db seed          # tsx prisma/seed.ts, idempoten
npx prisma migrate reset    # DB baru dari nol + seed (butuh persetujuan eksplisit pengguna)
npm run dev
npm run lint                # eslint (flat config)
npm run typecheck           # tsc --noEmit
npm run test                # vitest: proyek unit + integration (*.int.test.ts ke galeri_test, migrasi otomatis)
npm run build               # butuh PostgreSQL jalan (halaman Galeri di-prerender)
npm run admin:create        # akun pemilik (sekali); admin:reset-2fa, admin:reset-password untuk darurat
```

`TEST_DB_NAME=galeri_xxx_test npx vitest run …` memakai database test lain (nama wajib berakhiran `_test`), supaya beberapa run test integrasi bisa paralel.

Catatan versi (Oktober 2026):

- Next.js 16.4: baca `AGENTS.md` dan `node_modules/next/dist/docs/` sebelum memakai API Next. `params`/`searchParams` adalah Promise. `cacheComponents` sengaja dimatikan; layout Studio memakai `dynamic = "force-dynamic"`; layout Galeri `revalidate = 3600` + revalidate on-demand (`revalidateGallery()`).
- Server Action dibatasi 1 MB, jadi unggah foto lewat Route Handler (`receiveImageUpload` dari `src/lib/upload-route.ts`, client `uploadWithProgress`). `proxy.ts` membuffer body; batasnya dinaikkan ke 16 MB di `next.config.ts`.
- CSP tanpa nonce (`next.config.ts`): tanpa skrip/iframe/gambar pihak ketiga (Studio boleh gambar `https:` untuk foto URL lama). Gambar unggahan lewat `next/image` dengan `src="/media/<key>"`. `expireTime: 3600` supaya browser tidak menyajikan halaman Galeri basi (`stale-while-revalidate` default 1 tahun).
- og:image Galeri = JPEG dari `opengraph-image.ts` per segmen (`src/features/gallery/og-image.ts`); jangan isi `openGraph.images` manual di halaman Galeri.
- Prisma 6.x, Vitest 4 (`vitest.config.mts`, proyek `unit` dan `integration`). `prisma migrate dev` menolak jalan non-interaktif jika ada peringatan data; buat SQL dengan `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` ke folder migrasi baru, lalu `prisma migrate deploy`.
- Shadcn/ui gaya `radix-nova`; `cn` berasal dari paket `cn` (milik shadcn). Tambah komponen dengan `npx shadcn@latest add <nama>`.
- `react-hook-form`: pakai `useWatch`, bukan `form.watch()` (lint React Compiler).
- Bersama: `src/lib/action.ts` (`ActionResult`, `ok`, `fail`, `fromZodError`), `src/lib/labels.ts` (label enum), `src/features/contents/service.ts` (`createContentWithChecklist`), `src/features/settings/queries.ts` (`getSettings`, `getTaxonomies`).
- Satu Post per platform per konten (`@@unique([contentId, platform])`). "Post per minggu" dihitung per konten, bukan per platform.
- Teks UI Galeri dari `src/features/gallery/copy.ts`; data Galeri hanya dari `src/features/gallery/queries.ts` (DTO `dto.ts`).
- Client memanggil Server Action lewat `callAction(() => action(input))` (`src/lib/action-client.ts`) atau `useMutation` + `unwrap`, supaya request gagal jadi toast, bukan halaman crash.
- Tambah/kurang hari pada instant WIB pakai `addWibDays` (bukan `addDays` date-fns, yang mengikuti zona waktu runtime). Validasi input tanggal pakai `isValidWibDateString` / `isValidWibInputValue`.
- Keputusan implementasi Fase 1 dicatat di bagian akhir `docs/FASE-1.md`.

## Fase

- **Fase 1 (fondasi Studio):** selesai, lihat `docs/FASE-1.md`.
- **Fase 2 (Galeri + auth):** selesai (deploy menunggu VPS), lihat `docs/FASE-2.md`. Studio pindah ke `/studio`, PostgreSQL, login + 2FA + sesi + `proxy.ts` + `requireAdmin()`, menu Karya + unggah foto (sharp, hapus EXIF), profil publik, Galeri (Beranda, Katalog, Detail, Tentang), SEO, deploy ke domain.
- **Fase 3 (Asisten AI, persiapan konten):** Panduan AI di Pengaturan, tombol Bantu AI (kembangkan ide, ide dari proyek, hook, script/shot list, caption + hashtag, teks karya dari foto), batas biaya, log `AiRun`, set uji. Lihat PRD bagian "Asisten AI".
- **Fase 4 (data):** Postingan, input metrik H+1/H+7, snapshot followers, `lib/analytics/grouping.ts`, Analitik (Recharts), Beranda Studio penuh. Siapkan ID post platform + sumber metrik untuk impor API nanti.
- **Fase 5 (saran + AI analisis):** `lib/analytics/rules.ts`, Eksperimen, Review Mingguan (+ draf ringkasan AI), "Kenapa?" di detail post, PWA + capture ide offline, ekspor/backup.
- **Fase 6 (toko):** keranjang, checkout, pembayaran, ongkir, pesanan.

Aturan Asisten AI (berlaku mulai Fase 3):

- AI hanya dipanggil dari server setelah `requireAdmin()`; `ANTHROPIC_API_KEY` tidak pernah sampai ke client. Pakai SDK resmi `@anthropic-ai/sdk`, model default `claude-opus-5-5`.
- AI hanya mengisi draf di form; jangan pernah menyimpan, menerbitkan, atau memposting hasil AI tanpa aksi pengguna.
- Angka (ER, skor, median) selalu dihitung `lib/analytics` lalu dikirim ke AI; jangan meminta AI menghitung.
- Setiap panggilan dicek terhadap batas biaya/harian dan dicatat di `AiRun`. Panggilan yang membutuhkan biaya (termasuk set uji) hanya dijalankan dengan persetujuan pengguna.

Aturan Galeri dan keamanan (berlaku mulai Fase 2):

- Query Galeri hanya di `src/features/gallery/` dan hanya memilih field publik; jangan pernah mengirim karya Draft, harga dengan `showPrice = false`, atau data Studio ke halaman publik.
- Setiap halaman, Server Action, dan Route Handler Studio memanggil `await requireAdmin()`. `proxy.ts` hanya cek cepat.
- Foto unggahan selalu diproses ulang dengan sharp (tanpa metadata EXIF/GPS) dan disimpan dengan nama acak.

Kerjakan satu fase per sesi. Satu fitur dianggap selesai hanya jika `npm run lint`, `npm run typecheck`, `npm run test`, dan `npm run build` lolos.

## Cara kerja dengan agent

- Untuk pekerjaan besar, pakai subagent per area yang tidak saling menyentuh file yang sama (misalnya satu agent untuk `features/ideas`, satu untuk `features/contents`). Schema Prisma, `src/lib/*`, dan layout dikerjakan dulu oleh sesi utama sebelum agent fitur dimulai.
- Setelah agent selesai, sesi utama yang menjalankan lint, typecheck, test, dan build, lalu memperbaiki konflik.
- Pakai subagent yang belum melihat kode untuk mereview fitur sebelum ditutup.
