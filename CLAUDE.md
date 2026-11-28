# Galeri & Studio Karya (nama sementara; dulu Content Growth Planner)

Satu web app, satu domain, dua sisi:

- **Galeri** (publik, `/`): etalase karya gambar dan patung clay ala katalog marketplace. Nanti menjadi toko.
- **Studio** (privat, `/studio`, wajib login): content planner untuk konten TikTok/Instagram (target 2-3 post per minggu, keputusan berbasis data) plus pengelolaan karya yang tampil di Galeri.

Spesifikasi lengkap ada di `docs/PRD.md`. Baca PRD sebelum mengerjakan fitur baru; jika implementasi menyimpang dari PRD, tanyakan dulu atau perbarui PRD di commit yang sama. Fase 1 ada di `docs/FASE-1.md`, Fase 2 di `docs/FASE-2.md`, Fase 3 di `docs/FASE-3.md`, Fase 4 di `docs/FASE-4.md`, Fase 5 di `docs/FASE-5.md`, Fase 6 di `docs/FASE-6.md`, Fase 7 di `docs/FASE-7.md`.

> Status kode (28 Nov 2026): Fase 7 selesai (animasi dan interaksi dari token: tingkat Mati/Halus/Penuh per sisi di menu Tampilan, muncul saat di-scroll, judul per baris, hitung naik, skeleton `loading.tsx`, transisi antarhalaman dan ganti mode lewat View Transitions, selalu menghormati "kurangi gerakan"). Fase 1-6 selesai; deploy ke VPS menunggu domain + VPS (`docs/DEPLOY.md`). Keputusan implementasi di akhir setiap `docs/FASE-*.md`.

## Lingkungan

- Dikembangkan dan dijalankan lokal di Windows (PowerShell). Semua npm script harus lintas platform: tanpa `rm -rf`, tanpa `FOO=1 cmd`, tanpa path absolut. Pakai paket seperti `rimraf` atau `cross-env` jika perlu.
- Path folder proyek mengandung spasi (`repo eksperimen\content planner`): selalu beri tanda kutip pada path di perintah shell.
- Package manager: npm. Node 20 atau lebih baru.
- Database: PostgreSQL 18 lokal, role `galeri`, database `galeri_dev` (aplikasi) dan `galeri_test` (test integrasi). `.env` berisi password dan **tidak di-commit**; contoh nilai di `.env.example` (`DATABASE_URL`, `DATABASE_URL_TEST`, `UPLOAD_DIR`, `SITE_URL`, `ANTHROPIC_API_KEY`, `AI_MOCK`). Kunci API ditulis pengguna sendiri; jangan pernah menampilkan isi `.env`. `AI_MOCK=1` = mode uji AI tanpa API (untuk uji browser/pengembangan), tidak pernah di produksi.
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
- sharp (gambar), qrcode (QR setup 2FA). Fase 3: `@anthropic-ai/sdk` (Asisten AI). Fase 4: Recharts 3 (hanya Studio, lewat `src/components/charts/`). Fase 5: PWA dengan service worker sendiri (tanpa Serwist, hanya Studio)

## Struktur

```
src/proxy.ts                     # cek cepat cookie sesi untuk /studio/* → /masuk?next=
src/app/(galeri)/                # Galeri publik: layout, page (/), karya/, karya/[slug]/, tentang/
src/app/masuk/                   # login Studio (password → 2FA)
src/app/studio/(app)/<menu>/     # Studio: (beranda)/page.tsx = /studio; ide, pipeline, kalender, proyek, karya, postingan, analitik, eksperimen, review, pengaturan, tampilan
                                 # template.tsx (crossfade antarmenu), loading.tsx (skeleton) di Beranda, Postingan, Analitik, Pipeline, Kalender, Review
src/app/media/[...key]/route.ts  # penyaji file unggahan (publik, cache immutable)
src/app/sitemap.ts, robots.ts
src/features/<domain>/           # components/, actions.ts, schema.ts, queries.ts
src/features/auth/               # dal.ts (requireAdmin), session, totp, password, login-actions.ts
src/features/gallery/            # queries.ts (satu-satunya pintu data Galeri), dto.ts, copy.ts (teks Galeri), format.ts, catalog.ts, revalidate.ts
src/features/ai/                 # Asisten AI: client.ts (satu-satunya pembaca ANTHROPIC_API_KEY + mode uji), prompts/ (berversi, murni),
                                 # context.ts (data per fitur, allowlist), run.ts, limits.ts, guide*.ts, components/ (panel Bantu AI), evals/
src/app/studio/ai/route.ts       # POST Asisten AI → NDJSON (partial/done/error)
src/features/metrics/            # snapshot metrik + followers, getScoredPosts (status + skor semua post), parse-count.ts, format.ts,
                                 # post-filters.ts, components/ (MetricFormButton, AccountSnapshotButton, status badge, Postingan)
src/features/analytics/          # halaman Analitik: filter URL, select-posts.ts, targets.ts, components/
src/features/home/               # Beranda Studio: queries.ts, derive.ts, components/
src/features/suggestions/        # input mesin aturan (queries.ts, satu kali baca), dismissSuggestion, copy.ts (teks + tautan), kartu saran
src/features/experiments/        # Eksperimen A/B; src/features/reviews/ Review Mingguan (ringkasan beku di summaryJson)
src/features/export/             # ekspor CSV/JSON; Route Handler src/app/studio/ekspor/[file]/route.ts
src/features/pwa/                # antrean ide offline (offline-queue.ts murni, idb.ts), pendaftaran service worker, hapus cache
src/features/theme/              # tema: queries.ts (getTheme, cache per request, fallback default), actions.ts (saveTheme/resetTheme),
                                 # fonts.ts (instance next/font), components/ (menu Tampilan + ThemeShowcase)
src/lib/theme/                   # token tema murni: schema.ts (Zod strict), defaults.ts (preset Monokrom/Bento), css.ts (token → CSS),
                                 # contrast.ts (WCAG), fonts.ts (daftar terkurasi), meta.ts (label menu)
src/components/design/           # komponen gaya Fase 6: TwoToneHeading, SectionLabel/MetaLabel, ArrowLink, StatPill, BentoCard, ThemeModeToggle
src/components/motion/           # primitif animasi Fase 7: Reveal/useReveal, RevealLines, CountUp, useMotionLevel, MotionRoot,
                                 # view-transitions (SharedElement, PageTransition, SwapTransition), theme-switch, motion-utils (murni)
src/lib/theme/motion.ts          # tingkat animasi akhir: sisi per path, kurangi gerakan, skrip awal <head>
public/studio-sw.js              # service worker Studio (scope /studio); studio-offline.html, studio.webmanifest, studio-icons/
src/components/charts/           # SATU-SATUNYA pengimpor recharts: TimeLineChart, GroupBarChart, warna per platform
src/lib/routes.ts                # SEMUA path internal (href, router.push, redirect, revalidatePath)
src/lib/storage.ts, images.ts    # simpan/baca/hapus file; sharp (resize 2400, WebP 82, tanpa EXIF)
src/lib/upload-route.ts          # helper Route Handler unggah (server); upload-client.ts = XHR + progres (client)
src/lib/slug.ts, site.ts         # slugify + slug unik; SITE_URL/absoluteUrl
src/lib/analytics/               # metrics, snapshots, scoring, grouping, kpi, streak, tasks, compare, ai-usage, rules (saran), experiments, review (fungsi murni, tanpa Prisma/React/Next)
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
npm run ai:eval -- <fitur|semua> [--model …] [--batas n] [--panduan-db] [--konfirmasi]   # set uji AI; --konfirmasi = BERBIAYA (tanya pengguna dulu), kecuali AI_MOCK=1
npx tsx scripts/demo-metrics.ts [--jumlah 1000] [--hapus]   # data contoh metrik berlabel [Demo] di galeri_dev; hapus lagi setelah uji
```

`TEST_DB_NAME=galeri_xxx_test npx vitest run …` memakai database test lain (nama wajib berakhiran `_test`), supaya beberapa run test integrasi bisa paralel.

Catatan versi (Oktober 2026):

- Next.js 16.4: baca `AGENTS.md` dan `node_modules/next/dist/docs/` sebelum memakai API Next. `params`/`searchParams` adalah Promise. `cacheComponents` sengaja dimatikan; layout Studio memakai `dynamic = "force-dynamic"`; layout Galeri `revalidate = 3600` + revalidate on-demand (`revalidateGallery()`).
- Server Action dibatasi 1 MB, jadi unggah foto lewat Route Handler (`receiveImageUpload` dari `src/lib/upload-route.ts`, client `uploadWithProgress`). `proxy.ts` membuffer body (batas 2 MB di `next.config.ts`), jadi route unggah dikeluarkan dari matcher proxy dan dijaga `requireAdmin()` sendiri; route unggah baru harus ditambahkan ke pengecualian matcher itu.
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
- Asisten AI (`@anthropic-ai/sdk` 1.x): `client.beta.messages.stream` + structured output lewat `src/features/ai/output-schema.ts` (bukan `betaZodOutputFormat` SDK, yang membuang `enum`; tanpa auto-parse: `stop_reason` dicek dulu, lalu Zod). Skema output ikut menentukan cache prompt, jadi buat skema yang stabil (mis. nomor foto, bukan id), effort per fitur di prompt, thinking adaptif bawaan (jangan kirim `thinking: disabled`/`budget_tokens`, ditolak Opus 5.5), `fallbacks: "default"` + beta `server-side-fallback-2026-07-01` untuk Opus/Sonnet (bukan Haiku). Biaya dari `usage.iterations` × harga di `src/features/ai/models.ts`. Prompt sistem (instruksi dasar + Panduan AI) harus deterministik supaya ter-cache; data per permintaan di pesan user.
- Fitur AI baru: tambah prompt di `src/features/ai/prompts/` (+ `FEATURE_PROMPTS`, `CONTEXT_LOADERS`, sampel `mock.ts`, kasus `evals/`), lalu pakai `useAiAssist` + `AiAssistPanel` di komponen. Mengubah teks tugas/skema → naikkan versi prompt dan hash di `prompts.test.ts`. Test memakai mock (`vi.mock` `./client`), tidak pernah API asli.
- Metrik: `getScoredPosts()` (`src/features/metrics/queries.ts`) satu-satunya sumber status dan skor per post. Skor relatif butuh riwayat penuh per platform, jadi selalu dihitung dari semua post tayang, lalu halaman menyaring hasilnya; jangan menghitung ulang setelah menyaring. Fungsi di `lib/analytics` menyaring platform sendiri supaya pemanggil tidak bisa mencampur.
- `MetricSnapshot` unik per `postId + kind` (kecuali CUSTOM) lewat partial unique index yang ditulis manual di migrasi `20261105090000_data`; schema Prisma tidak bisa menyatakannya dan `prisma migrate diff` tidak melaporkannya. Upsert snapshot = `updateMany` lalu `create`, tangkap P2002. Jangan menghapus index itu saat membuat migrasi baru.
- Input angka metrik lewat `parseCount` (`12.345`, `12,3K`, `1,2rb`, `1,2jt`). Schema idempoten: string dari form, atau bilangan bulat hasil parse di client. `inputMode="numeric"` tidak punya huruf di HP, jadi form metrik dan snapshot followers punya tombol akhiran K/jt (`CountSuffixChips`). Di form metrik, Enter pindah ke field berikutnya: field kosong berarti 0, jadi form tidak boleh tersimpan setengah isi.
- Format angka UI dari `src/features/metrics/format.ts` (null/NaN → "—"). Jangan `notation: "compact"` Intl: hasilnya bisa beda antara Node dan browser (hydration).
- Grafik: warna seri hanya `SERIES_COLORS[platform]` (`--series-tiktok`, `--series-instagram`, lolos validator dataviz di kedua mode), satu platform per grafik, jadi tanpa legend. Test statis `charts-boundary.static.test.ts` menjaga Recharts tetap di luar Galeri.
- `getSettings()` hanya membaca lalu membuat baris jika belum ada, dan di-`cache` per request; aman dipanggil paralel. Jangan kembali ke `upsert` (dua upsert paralel pada tabel kosong gagal P2002).
- `proxy.ts` menulis ulang cookie sesi sebagai httpOnly di setiap request. Untuk menguji sesi yang hilang, hapus baris `Session` di database, bukan cookie lewat JS.
- Saran: `computeSuggestions` (`lib/analytics/rules.ts`) murni; masukannya dari `getRuleInput(now)` (`features/suggestions/queries.ts`). Panggil `getSuggestions`/`getSuggestionViews` dengan `now` yang sama dengan halaman supaya `getScoredPosts` (cache per request, berkunci argumen) tidak dihitung dua kali. Kunci saran `aturan:platform:subjek` harus stabil; aturan baru wajib test positif/negatif dan pemisahan platform. Aksi yang mengubah data saran me-revalidate Beranda dan Review (`revalidateMetrics`/`revalidateContent` sudah, juga Eksperimen).
- AI analisis (`review-draft`, `post-why`): pengambil data di `features/ai/analysis-context.ts`, angka dari `lib/analytics`; grup < 3 post dikirim tanpa median dengan label `NOT_ENOUGH_DATA` ("data belum cukup"). Aturan angka bersama ada di `prompts/analysis-common.ts` (bagian teks tugas berversi).
- PWA: service worker `public/studio-sw.js` ditulis sendiri, file statis di luar matcher proxy (tanpa login), didaftarkan hanya oleh `StudioServiceWorker` di layout Studio dengan scope `/studio` (bukan `/studio/`, supaya Beranda ikut). Hanya meng-cache halaman offline, manifest, dan ikon; HTML Studio tidak pernah. Mengubah service worker atau `studio-offline.html` → naikkan `VERSION` di service worker. Konstanta IndexedDB di halaman offline harus sama dengan `OFFLINE_IDEA_DB` (dicek test). Ide offline dikirim dengan `offlineId` (unik di `Idea`) supaya kirim ulang tidak menggandakan. CSP: `worker-src 'self'` di Studio, `'none'` di Galeri.
- Ekspor: tabel baru di schema wajib masuk daftar ekspor JSON atau daftar pengecualian auth (dicek test terhadap DMMF Prisma).

## Fase

- **Fase 1 (fondasi Studio):** selesai, lihat `docs/FASE-1.md`.
- **Fase 2 (Galeri + auth):** selesai (deploy menunggu VPS), lihat `docs/FASE-2.md`. Studio pindah ke `/studio`, PostgreSQL, login + 2FA + sesi + `proxy.ts` + `requireAdmin()`, menu Karya + unggah foto (sharp, hapus EXIF), profil publik, Galeri (Beranda, Katalog, Detail, Tentang), SEO, deploy ke domain.
- **Fase 3 (Asisten AI, persiapan konten):** selesai, lihat `docs/FASE-3.md`. Panduan AI di Pengaturan, tombol Bantu AI (kembangkan ide, ide dari proyek, hook, script/shot list, caption + hashtag, teks karya dari foto), batas biaya, log `AiRun`, set uji. Lihat PRD bagian "Asisten AI".
- **Fase 4 (data):** selesai, lihat `docs/FASE-4.md`. Postingan, input metrik H+1/H+7, snapshot followers, `lib/analytics`, Analitik (Recharts), Beranda Studio penuh, target 3 bulan. Kolom `Post.externalId` dan `source` sudah ada untuk impor API nanti.
- **Fase 5 (saran + AI analisis):** selesai, lihat `docs/FASE-5.md`. Mesin aturan `lib/analytics/rules.ts` + kartu saran Beranda (Sembunyikan 7 hari), Eksperimen A/B, Review Mingguan (+ draf ringkasan AI), "Kenapa?" di detail post, PWA Studio + ide offline, ekspor CSV/JSON.
- **Fase 6 (tampilan):** selesai, lihat `docs/FASE-6.md`. Token tema (`ThemeSetting`), mode gelap/terang di Galeri dan Studio, menu Tampilan (kustomisasi warna/font/teks h1-h6/radius/animasi, pratinjau, reset ke tampilan awal), redesain Galeri (referensi Euronium) dan Studio (referensi AKA).
- **Fase 7 (animasi dan interaksi):** selesai, lihat `docs/FASE-7.md`. Token animasi v2 (jeda, jarak, tingkat Mati/Halus/Penuh per sisi), primitif `src/components/motion/`, animasi Galeri dan Studio, `loading.tsx` dengan skeleton, transisi antarhalaman dan ganti mode (View Transitions), selalu menghormati `prefers-reduced-motion`.
- **Fase 8 (toko):** keranjang, checkout, pembayaran, ongkir, pesanan.

Mulai 25 Nov 2026 fokus proyek adalah penyempurnaan tampilan. Aturan tampilan (berlaku mulai Fase 6):

- Warna, font, ukuran/ketebalan teks, radius, dan durasi animasi hanya lewat token tema (variabel CSS + utility Tailwind dari `@theme inline`). Jangan menulis hex, `oklch(`, atau nama warna Tailwind langsung di komponen, kecuali palet grafik `src/components/charts/` yang tervalidasi.
- Setiap tampilan dicek di mode terang dan gelap, desktop dan 375 px.
- Nilai tema dari database selalu lewat validasi Zod `src/lib/theme/`; CSS hanya dibangun dari variabel yang dikenal.
- Token dirender root layout sebagai `<style id="theme-tokens">` (`buildThemeCss`); `globals.css` hanya memetakan variabel ke utility (`@theme inline`). Tanpa baris `ThemeSetting` = tampilan awal; Reset menghapus baris. Simpan/Reset me-revalidate `/` layout (seluruh situs).
- Utility tema: warna (`bg-card`, `text-heading-muted`, `bg-bento-lime`, `text-success`, `bg-media` untuk di atas foto), `font-heading`, ukuran (`text-display`, `text-h1`…`text-h6`, `text-body(-lg|-sm)`, `text-caption`, `type-label`, `text-wordmark`), radius (`rounded-card`, `-card-nested`, `-button`, `-input`, `-badge`, `-image`, `-dialog`), animasi (`duration-fast|base|slow`, `ease-standard`). Skala bawaan Tailwind (`text-sm`, `text-2xl`, `rounded-lg`) ikut token sebagai alias. `bg-accent` = warna aksen (ungu), bukan hover; hover = `bg-muted`.
- `cn` selalu dari `@/lib/utils` (`createCn` yang mengenal utility tema; tanpa itu `text-h1 text-muted-foreground` saling buang). Utility tema baru → daftarkan di `src/lib/utils.ts` (+ `utils.test.ts`).
- `src/lib/theme/token-usage.static.test.ts` menolak hex, `oklch(`, warna Tailwind bawaan, `text-[..]`/`rounded-[..]` arbitrer, `duration-<angka>`, `ease-in/out`, dan `font-serif/display` di `src/`; pengecualian dicatat di `ALLOWED` beserta alasannya (palet grafik, warna default pilar).
- Pratinjau tema lokal: `themeVariables(tokens, mode)` sebagai `style` kontainer + `data-theme-preview="light|dark"` (+ kelas `dark`). Varian `dark:` dibatalkan di dalam `data-theme-preview="light"`.
- Font baru: tambah di `src/lib/theme/fonts.ts` dan instance di `src/features/theme/fonts.ts` (nama variabel sama, `preload: false`; dicek `fonts.static.test.ts`). Hanya font default yang di-preload.
- Grafik selalu di atas permukaan kartu (`bg-card`): oranye Instagram hanya 2,93:1 di latar halaman `#F5F5F3`.
- Halaman offline PWA dan gambar Open Graph (`renderOgImage`) memakai nilai default tema, bukan database (T14).

Aturan animasi (berlaku mulai Fase 7, keputusan A1-A9 di `docs/FASE-7.md`):

- Tanpa library animasi: CSS (transition/keyframes dari token), `IntersectionObserver`, dan `<ViewTransition>` React. Library baru hanya dengan persetujuan pengguna.
- Satu sumber tingkat: `<html data-motion="off|subtle|full">`. Server menulis tingkat per sisi dari token (`data-motion-gallery`/`data-motion-studio`), skrip statis `MOTION_INIT_SCRIPT` di `<head>` memilih sisi dari path (`/studio`, `/masuk` = Studio) dan menurunkan ke `off` saat "kurangi gerakan", lalu `MotionRoot` menjaganya saat navigasi. Jangan membaca `matchMedia` sendiri: pakai `useMotionLevel()`/`motionLevelOf(el)`.
- Variabel turunan per tingkat (`--motion-reveal`, `--motion-step`, `--motion-shift`, …) didefinisikan di akhir `globals.css` (di luar `@layer`, supaya menang atas `<style>` tema); `data-motion` terdekat menang (kontainer pratinjau Tampilan). Tingkat Mati membuat semua durasi 0, termasuk `duration-fast|base|slow`. Tanpa `data-motion` (tanpa JS) semua efek diam.
- Isi tidak pernah disembunyikan di HTML server (A4). Status tersembunyi hanya lewat primitif: `Reveal`/`useReveal` (efek `up`/`fade`; JS menyembunyikan hanya elemen yang seluruhnya di bawah layar, diputuskan dari callback pertama IntersectionObserver tanpa layout paksa; muncul saat masuk layar atau menerima fokus), `motion-enter*` (CSS saat dipasang, hanya aktif jika `data-motion` ada), `RevealLines`/`TwoToneHeading reveal`. Elemen dengan Reveal jangan punya `transition-*` sendiri. Angka statistik pakai `CountUp` (nilai akhir di HTML, lebar dipesan, `formatCount` tanpa Intl, sekali per pemasangan).
- Hanya `transform`/`translate`/`scale`, `opacity`, dan `clip-path` yang dianimasikan; tanpa animasi properti layout, tanpa CLS. Utility: `motion-enter(-fade|-clip|-zoom)`, `motion-grow-x`, `motion-exit`, `motion-zoom`, `motion-nudge`, `motion-press`, `motion-lift`, `motion-check`, `motion-shimmer`, `motion-caret`; jeda berurutan `style={motionIndex(i)}`.
- Durasi untuk library yang meminta angka (dnd-kit, Recharts) dibaca dari token dengan `motionDurationOf(el, speed)`/`motionEasingOf(el)`. Grafik: `isAnimationActive` mati saat tingkat Mati (A9).
- View Transitions: kelas hanya dari `VT_CLASS` (`vt-morph`, `vt-page`, `vt-fade`, `vt-pill`) di `src/components/motion/view-transitions.tsx`; transisi halaman dipasang di `template.tsx` per sisi (bukan layout); nama elemen bersama harus unik per halaman (`artworkPhotoTransitionName(slug)` hanya di kartu katalog dan foto utama detail). Ganti mode = `switchModeWithReveal` (penyingkapan melingkar).
- `token-usage.static.test.ts` juga menolak `delay-<angka>`, `ease-[..]`, `animate-[..]`, `[animation:..]`, `transition-[..ms]`, transisi properti layout (`transition-all`, `transition-[width]` …; bilah progres pakai `scaleX`), `animate-pulse` (pakai `Skeleton`/`motion-shimmer`), durasi ms di string inline, dan `@keyframes` di luar `src/app/globals.css`. Keyframes baru ditambah di `globals.css` dengan durasi/easing dari variabel token.
- `template.tsx`/`loading.tsx` di Studio harus murni tampilan (tanpa `await`, database, queries, actions, cookies/headers; dicek `require-admin.static.test.ts`). Beranda Studio ada di route group `(beranda)` supaya skeletonnya tidak berlaku untuk menu lain.

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
