# Fase 7: Animasi dan detail interaksi

Status: selesai 28 Nov 2026 (belum di-commit saat ditulis). Fase 1-6 selesai, di-commit, dan di-push (`129aa9e`, Next.js 16.4.6). Deploy ke VPS masih menunggu domain dan VPS dari pengguna. Keputusan dan hasil di bagian "Hasil dan keputusan implementasi" di akhir file.

Tujuan: Galeri terasa hidup dan premium seperti referensi (Euronium/AKA), dan Studio terasa responsif dan halus. Semua animasi tetap cepat, tidak mengganggu, mengikuti token animasi Fase 6, dan mati otomatis jika pengguna perangkat memilih "kurangi gerakan".

## Scope

**Masuk Fase 7:**

- Token animasi diperluas, dan bagian **Animasi** di menu Tampilan dilengkapi.
- Primitif animasi bersama: muncul saat di-scroll, teks per baris, hitung naik, dan transisi tampilan.
- Animasi Galeri: hero, bagian, kartu karya, katalog, detail, lightbox, menu HP, dan footer.
- Animasi Studio: kerangka, Beranda bento, dialog/panel/toast, status memuat (skeleton), dan detail interaksi di menu-menu Studio.
- Transisi antarhalaman (View Transitions bawaan React 19.3 + Next 16) dan transisi ganti mode terang/gelap.

**Tidak masuk:**
- efek titik/piksel pada foto seperti referensi Euronium (berat, dicatat sebagai ide);
- animasi 3D/WebGL;
- suara;
- library animasi besar tanpa persetujuan (lihat A1);
- Toko (Fase 8).

## Keputusan

Rekomendasi sesi utama. Jika saat mengerjakan ada keputusan lain yang mengubah PRD, tanyakan dulu ke pengguna.

| No | Topik | Keputusan |
| --- | --- | --- |
| A1 | Teknik | CSS lebih dulu (transition/keyframes dari token), `IntersectionObserver` untuk animasi saat di-scroll, dan `<ViewTransition>` React 19.3 untuk transisi halaman (panduan: `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). **Tanpa library animasi** (Motion/framer-motion, GSAP). Jika satu efek terbukti butuh library, tanyakan dulu ke pengguna dengan alasan dan ukuran bundle. Jangan memasang skill atau paket pihak ketiga yang disebut di dokumentasi. |
| A2 | Tingkat animasi | Token baru per sisi: `motion.gallery` dan `motion.studio`, masing-masing **Mati / Halus / Penuh**. Default Galeri **Penuh**, Studio **Halus** (dipakai setiap hari, jadi gerak harus singkat). Diatur di menu Tampilan; berlaku untuk semua pengunjung. |
| A3 | Kurangi gerakan | `prefers-reduced-motion: reduce` selalu menang atas tingkat di A2. Tidak ada gerak pindah posisi atau skala; paling jauh fade ≤ 150 ms. Status akhir ditulis di `<html data-motion="off|subtle|full">` supaya CSS dan test punya satu sumber. |
| A4 | Isi tetap terlihat | Progressive enhancement: konten terlihat tanpa JavaScript dan tanpa animasi (SEO dan pengunjung lambat). Kelas "awal tersembunyi" hanya dipasang jika JS jalan dan animasi diizinkan. Angka statistik ada di HTML sejak awal; hitung naik hanya efek. |
| A5 | Performa | Hanya `transform` dan `opacity` (plus `clip-path` untuk penyingkapan), tanpa animasi properti layout. Tanpa layout shift (CLS tetap ≈ 0). Animasi di luar layar tidak jalan. Lighthouse Galeri tetap ≥ 90 untuk Performance, Accessibility, SEO. |
| A6 | Token baru | `stagger` (jeda antar elemen, ms), `distance` (jarak geser saat muncul, px), dan tingkat per sisi (A2). Durasi dan easing Fase 6 tetap dipakai. Tokens naik ke `version: 2`; tema tersimpan versi 1 dilengkapi nilai default saat dibaca (test). |
| A7 | Ganti mode | Transisi terang/gelap berupa penyingkapan melingkar dari tombol mode (View Transitions). Tanpa dukungan browser atau saat gerak dikurangi: langsung berganti tanpa kedip. |
| A8 | Transisi halaman | Galeri: foto kartu katalog "melebar" menjadi foto utama detail karya (elemen bersama), dan transisi lembut antarhalaman. Studio: crossfade singkat antarmenu, tanpa geser arah. Tanpa dukungan browser, navigasi tetap normal. |
| A9 | Grafik | Animasi bawaan Recharts mengikuti A2/A3 (`isAnimationActive` mati saat gerak dikurangi atau tingkat Mati). Palet grafik tidak berubah. |

### Daftar animasi

**Galeri** (tingkat Penuh; Halus = versi lebih pendek tanpa geser jauh):

- **Hero:**
  - judul dua warna muncul per baris (mask naik, berjeda `stagger`);
  - label meta dan tombol fade;
  - foto unggulan tersingkap (`clip-path`) dengan sedikit skala.
- **Bagian bernomor:** label "(01)" dan judul muncul saat di-scroll; isi menyusul.
- **Pil statistik:** angka menghitung naik sekali saat terlihat.
- **Kartu karya:** hover/fokus foto membesar halus (±1,04) dan ikon ↗ bergeser; muncul berjeda di grid.
- **Katalog:** perubahan filter crossfade hasil; "Muat lagi" memunculkan kartu baru berjeda.
- **Detail karya:** foto bersama dari katalog (A8), panel info masuk, lightbox membuka dan menutup dengan zoom dari foto asal.
- **Menu HP:** overlay masuk, tautan muncul berjeda; tombol bulat berubah menjadi tanda tutup.
- **Footer:** wordmark nama situs tersingkap saat di-scroll.

**Studio** (tingkat Halus default):

- **Kerangka:** pil menu aktif berpindah halus; crossfade antarmenu (A8).
- **Status memuat:** `loading.tsx` dengan skeleton yang meniru bentuk halaman untuk menu yang membaca data (Beranda, Postingan, Analitik, Pipeline, Kalender, Review), plus shimmer halus.
- **Beranda bento:** kartu muncul berjeda singkat, angka progres/streak menghitung naik, bilah progres tumbuh.
- **Komponen dasar:** dialog, sheet, dropdown, popover, tooltip, dan toast memakai durasi/easing token; tombol ditekan sedikit mengecil (0,98).
- **Detail interaksi:**
  - kartu kanban terangkat saat diseret dan mendarat halus;
  - checklist tercentang dengan animasi centang;
  - kartu saran yang disembunyikan mengecil keluar;
  - panel Bantu AI menampilkan kursor/shimmer saat streaming;
  - badge status metrik berganti dengan crossfade.
- **Grafik** masuk sesuai A9.

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md (bagian "Tampilan dan tema"), dan docs/FASE-7.md sampai habis. Baca juga "Hasil dan keputusan implementasi" di docs/FASE-6.md. Kerjakan Fase 7 sesuai checklist di docs/FASE-7.md.
Langkah 1-4 kamu kerjakan sendiri. Lalu pakai subagent paralel untuk langkah 5-7 (satu agent per area, hanya menyentuh folder sendiri). Terakhir langkah 8-9, lalu centang checklist di file ini.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. Token animasi v2** (`src/lib/theme/`).
  - Tambah `stagger`, `distance`, `motion.gallery`, `motion.studio` (A2, A6). Pembacaan tema versi 1 dilengkapi default.
  - Pembangun CSS menulis variabel animasi. Atribut `data-motion` dipasang di `<html>` (server untuk tingkat, client untuk `prefers-reduced-motion`), tanpa kedip.
  - Test: skema, migrasi v1 → v2, CSS deterministik, kombinasi tingkat × kurangi gerakan.
- [x] **2. Primitif animasi** `src/components/motion/`.
  - `Reveal` (`IntersectionObserver`, sekali jalan, berjeda, progressive enhancement A4), `RevealLines` (teks per baris), `CountUp`, `useMotionLevel()`.
  - Utilitas CSS di `globals.css` yang membaca token dan `data-motion`.
  - Pembantu View Transitions (nama elemen bersama, kelas transisi).
  - Test logika murni (jeda, format angka, keputusan tingkat).
- [x] **3. Komponen dasar** (`src/components/ui/`, `src/components/design/`).
  - Dialog, Sheet, Dropdown, Popover, Tooltip, Tabs, Button (efek tekan), dan Sonner memakai token durasi/easing dan menghormati `data-motion`.
  - Komponen `Skeleton` sesuai radius token.
  - Tombol mode dengan transisi A7.
- [x] **4. Menu Tampilan: bagian Animasi** (`src/features/theme/`).
  - Tingkat Galeri dan Studio, durasi, easing, jeda, dan jarak.
  - Tombol **Putar ulang** di pratinjau supaya efek terlihat.
  - Catatan bahwa "kurangi gerakan" di perangkat selalu dihormati. Reset mengembalikan nilai animasi default.

### Fitur (boleh paralel dengan subagent; hanya folder sendiri, fondasi di atas hanya dibaca)

- [x] **5. Galeri** (`src/features/gallery/components/`, `app/(galeri)/`): semua animasi Galeri di daftar, termasuk elemen bersama katalog → detail (A8) dan lightbox.
- [x] **6. Kerangka Studio + Beranda + status memuat** (`src/components/layout/`, `src/features/home/`, `studio/(app)/page.tsx` → kini `studio/(app)/(beranda)/page.tsx`, `loading.tsx` per menu).
- [x] **7. Detail interaksi menu Studio** (kanban, checklist, saran, panel Bantu AI, badge metrik, grafik). Hanya lapisan tampilan; perubahan logika dilaporkan, bukan dikerjakan.

### Penutup (sesi utama)

- [x] **8. Integrasi.**
  - Transisi antarhalaman Galeri dan Studio (A8).
  - Cek tidak ada animasi yang memakai durasi/easing hardcode (`rg` untuk `duration-[`, `ease-[`, `transition-[` dengan ms, dan `@keyframes` di luar `globals.css`).
- [x] **9. Verifikasi dan dokumentasi.** (Lighthouse resmi belum: diganti pengukuran Chrome DevTools Protocol, lihat Hasil.)
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos.
  - **Uji manual** di build produksi, desktop + 375 px, terang + gelap:
    - setiap animasi di daftar terlihat benar;
    - tingkat Mati/Halus/Penuh di menu Tampilan berpengaruh setelah Simpan, dan Reset mengembalikan default;
    - `prefers-reduced-motion` (emulasi) mematikan gerak, isi tetap lengkap;
    - JavaScript mati: isi Galeri tetap terlihat (A4);
    - transisi katalog → detail dan ganti mode jalan di Chromium, dan browser tanpa dukungan tetap normal.
  - **Performa:** Lighthouse Galeri (Beranda, Katalog, Detail) ≥ 90 di HP, CLS ≈ 0; tidak ada long task baru yang jelas dari animasi; Beranda Studio tetap < 1 detik.
  - Review oleh subagent yang belum melihat kode: aksesibilitas gerak (vestibular, fokus tetap terlihat, tidak ada konten hilang), performa, konsistensi dengan token, dan tidak ada animasi yang menghalangi interaksi.
  - Perbarui PRD (bagian "Tampilan dan tema": A1-A9), README, dan `CLAUDE.md` (aturan animasi). Centang checklist ini dan tulis "Hasil dan keputusan implementasi".
  - Daftar file per modul + pesan commit dalam format PowerShell (`git add -A -- ...; if ($?) { git commit -m "..." }`) untuk di-commit pengguna, dicek dulu dengan `git add -n`.

## Definisi selesai

- Galeri dan Studio beranimasi sesuai daftar, halus di desktop dan HP, terang dan gelap.
- Semua durasi, easing, jeda, dan jarak berasal dari token, dan bisa diatur (termasuk dimatikan) di menu Tampilan.
- "Kurangi gerakan" di perangkat selalu dihormati, dan isi tidak pernah hilang tanpa JavaScript.
- Lighthouse Galeri tetap ≥ 90 dan CLS ≈ 0.
- Lint, typecheck, test, dan build lolos; checklist dicentang; temuan review ditindaklanjuti atau dicatat.

## Catatan

- Tidak ada paket baru yang direncanakan. View Transitions dan `<ViewTransition>` sudah ada di React 19.3 + Next 16 tanpa konfigurasi.
- Subagent fitur (langkah 5-7) tidak menjalankan `npm run build` (berbagi `.next`) dan memakai `TEST_DB_NAME` sendiri untuk test integrasi.
- Ide untuk nanti: efek titik/piksel pada foto hero seperti referensi Euronium, dengan opsi aktif per karya unggulan.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis di A1-A9.

**Fondasi (langkah 1-4, sesi utama)**

- **Token v2:** `stagger` 70 ms (0-300), `distance` 24 px (0-80), `gallery` Penuh, `studio` Halus. `upgradeThemeTokens` menaikkan tema v1 ke v2 (kunci baru diisi default, nilai lama dipertahankan, lalu tetap divalidasi schema). `getTheme` menerima baris versi ≤ 2; versi yang lebih baru dari kode → tampilan awal. Simpan selalu menulis versi 2.
- **Satu sumber tingkat:** server menulis `data-motion-gallery`/`data-motion-studio` di `<html>`. Skrip statis `MOTION_INIT_SCRIPT` di `<head>` (tanpa nilai dari database; dites sama dengan fungsi TS untuk 108 kombinasi path × tingkat × kurangi gerakan) menulis `data-motion` sebelum isi dilukis. `/studio…` dan `/masuk` = sisi Studio. `MotionRoot` menjaga nilainya saat navigasi client, setelah Simpan tema, dan saat preferensi perangkat berubah; ia membaca `matchMedia` langsung, karena snapshot hidrasi `useSyncExternalStore` (false) sempat menimpa "off" dari skrip awal (bug ditemukan saat uji dan diperbaiki).
- **"Kurangi gerakan" = Mati** (tanpa gerak sama sekali; A3 membolehkan "paling jauh" fade). Spinner pemuat bawaan (`animate-spin`) tetap berputar di tingkat Mati karena umpan balik fungsional, dan berhenti saat kurangi gerakan.
- **Variabel turunan per tingkat** ada di akhir `globals.css`, di luar `@layer` (harus menang atas `<style>` tema), dan diwariskan (`data-motion` terdekat menang). Penuh: muncul = durasi lambat, jeda penuh, geser penuh, mask baris 130 %, zoom hover 1,04, transisi halaman = sedang. Halus: muncul = sedang, jeda ½, geser 35 %, mask baris 35 % + fade, zoom 1,02, transisi halaman = cepat. Mati: semua 0, termasuk `--motion-fast/base/slow` (transisi komponen lama ikut mati). Tanpa `data-motion` (tanpa JS) semua nilai cadangan = diam.
- **Primitif** (`src/components/motion/`):
  - `Reveal`/`useReveal` (efek `up`/`fade`): satu IntersectionObserver bersama; urutan berjeda dari posisi baris lalu kolom (maks. 8). Keputusan "sembunyikan atau biarkan" diambil dari callback pertama observer dengan layar ASLI (`initialRevealDecision`, murni + test), bukan `getBoundingClientRect` saat hidrasi (layout paksa itu terukur menambah ±90 ms TBT di Beranda HP). Hanya elemen yang seluruhnya di bawah layar yang disembunyikan; yang terlihat sedikit, di atas layar, atau di luar layar ke samping (kartu baris geser) dibiarkan. Muncul begitu masuk layar (tanpa potongan area pemicu, supaya elemen kecil di ujung halaman tetap muncul) atau begitu menerima fokus keyboard (`focusin` + CSS `:focus-within`).
  - `RevealLines`: baris logis (bukan baris visual), jendela `clip-path` berinset negatif supaya aksen dan ekor huruf tidak terpotong, tanpa layout shift.
  - `CountUp`: nilai akhir di HTML, salinan tak terlihat memesan lebar, pembaca layar hanya membaca nilai akhir, format sendiri (`formatCount`, tanpa Intl), token dibaca saat angka terlihat (bukan saat hidrasi), hanya sekali per pemasangan (nilai yang berubah setelah `router.refresh()` langsung tampil, tanpa angka basi).
  - Utility `motion-*` dan semua keyframes hanya di `globals.css`; `motionDurationOf`/`motionEasingOf` untuk library yang meminta angka.
- **Komponen dasar:** Dialog/AlertDialog/Sheet `duration-base`, menu/popover/tooltip/select `duration-fast`, semua `ease-standard`. Button: tekan 0,98 (`motion-press`; `scale` ikut daftar transisi) dan ikon ↗ bergeser saat hover/fokus. Checkbox: centang tersapu hanya setelah diubah pengguna (bukan semua centang saat halaman dimuat). Skeleton: shimmer, `rounded-input`, `aria-hidden`. Sonner: durasi/easing token lewat CSS. `TwoToneHeading` dapat prop `reveal`, `BentoCard` dapat `style`.
- **Ganti mode (A7):** `switchModeWithReveal` → View Transition dengan lingkaran dari tengah tombol (jari-jari ke sudut layar terjauh). Transisi warna komponen dimatikan selama snapshot; kelas mode dipasang langsung lalu next-themes disinkronkan. Tanpa dukungan browser, tingkat Mati, atau kurangi gerakan: `setTheme` biasa.
- **Menu Tampilan:** tingkat Galeri dan Studio (pil Mati/Halus/Penuh + keterangan), durasi, jeda, jarak, easing, tombol "Animasi bawaan" (hanya bagian animasi), catatan bahwa kurangi gerakan selalu dihormati (+ peringatan jika perangkat ini sedang memintanya). Pratinjau: pilihan "Gerak Galeri/Studio" dan tombol **Putar ulang** (contoh dipasang ulang); kanvas punya `data-motion` sendiri (Mati = durasi 0 lewat style kontainer) dan mulai Mati sampai hidrasi selesai. Contoh di `ThemeShowcase` memakai primitif yang sama dengan situs.
- **Transisi halaman (langkah 8):** `template.tsx` per sisi. Galeri `vt-page`: lama pudar cepat, baru masuk lembut (sedikit naik di Penuh). Studio `vt-fade`: crossfade singkat. Filter katalog (searchParams) tidak memasang ulang template (dicek), jadi hanya hasil yang crossfade. Back/forward browser = navigasi biasa.
- **Test statis:** `token-usage.static.test.ts` juga menolak `delay-<angka>`, `ease-[..]`, `animate-[..]`, `[animation:..]`, `transition-[..ms]`, dan `@keyframes` di luar `globals.css` (dengan test aturannya). `require-admin.static.test.ts` kini mengizinkan `template.tsx`/`loading.tsx` di Studio asalkan murni tampilan (tanpa `await`, database, queries, actions, cookies/headers); `default.tsx` tetap dilarang.

**Fitur (langkah 5-7, subagent paralel)**

- **Galeri (5):**
  - Hero CSS murni: judul per baris (urutan 0-1), foto clip + zoom di urutan 0 (LCP tidak tertunda; gambar tetap `preload`), pengantar/tombol/caption/meta berjeda.
  - Bagian bernomor: label fade, judul `reveal="scroll"`, isi `Reveal` (`RevealSectionLabel` untuk bagian tanpa `SectionHeading`). Pil statistik `CountUp`.
  - Kartu karya: `Reveal`, zoom foto saat hover/fokus, ikon ↗ baru (pil `bg-media/75`, mulai 640 px supaya tidak bertabrakan dengan badge di grid HP). Badge dipindah ke luar bingkai foto supaya hanya foto yang ikut morph.
  - Katalog: `SwapTransition` (`katalog-hasil`, kunci = filter tanpa halaman); batch "Muat lagi" `motion-enter` berjeda.
  - Detail: `SharedElement` hanya di grid katalog (prop `sharedTransition`) dan foto utama; panel info berjeda; lightbox membuka dari dan menutup ke foto asal (`lightbox-origin.ts` murni + test; memakai variabel tw-animate `--tw-enter-scale`/`--tw-exit-scale` dari kelas zoom Dialog, jadi mengubah animasi Dialog bisa memengaruhinya).
  - Menu HP: ikon tombol berputar dari garis ke silang, tautan berjeda. Footer: wordmark `RevealLines trigger="scroll"`.
- **Kerangka Studio (6):** pil menu aktif = lapisan sendiri dengan `ViewTransition` bernama (`studio-nav-pill-sidebar`/`-bottom`, kelas `vt-pill`) yang meluncur ke menu baru. Beranda dipindah ke route group `src/app/studio/(app)/(beranda)/` supaya skeletonnya tidak tampil untuk menu lain (URL tetap `/studio`). `loading.tsx` untuk Beranda, Postingan (+ `[id]`), Analitik, Pipeline (+ `[id]`), Kalender, Review (bahan bersama `page-skeleton.tsx`; wadah `aria-busy` + status sr-only). Bento masuk berjeda, angka progres dan streak `CountUp`, bilah progres tumbuh.
- **Interaksi Studio (7):** kanban dan kalender memakai `DragLift` (terangkat `motion-lift`, mendarat dengan `dropAnimation` durasi/easing token, `null` saat Mati; overlay tidak menangkap klik saat mendarat; lebar overlay = kartu asal). Kalender: kartu yang diterima memudar di tempat. Checklist: coret memudar, bilah progres `scale-x` (bukan `width`). Kartu saran: `motion-exit`, lalu dilepas (cadangan timer 2× durasi; Mati = langsung). Panel AI: skeleton sebelum potongan pertama, kursor `motion-caret` saat streaming, `aria-live` tetap. Badge metrik: crossfade hanya saat status berubah. Grafik: `useChartAnimation()` (Mati = tanpa animasi, Halus = sedang, Penuh = lambat, easing token sebagai cubic-bezier). Urutan foto karya (`photo-list`) ikut memakai transisi token.

**Verifikasi (langkah 9, 28 Nov 2026)**

- `npm run lint`, `npm run typecheck`, `npm run test` (134 file, 1.610 test, termasuk integrasi), dan `npm run build` lolos (juga diulang setelah tindak lanjut review).
- **Uji di build produksi** lewat Chrome headless lokal (DevTools Protocol, tanpa paket baru; pane preview tersembunyi sehingga render dan observer-nya dibatasi):
  - Galeri `/`, `/karya`, detail, `/tentang` di 375 px dan 1440 px, terang dan gelap: tanpa error konsol, tanpa overflow horizontal, dan setelah digulir semua `Reveal` muncul (0 tertinggal tersembunyi).
  - Frame tengah diperiksa dengan membekukan Web Animations: mask baris judul, foto tersingkap, jeda 70/140/210/280 ms sesuai token.
  - Kurangi gerakan (emulasi): `data-motion="off"`, durasi 0, tidak ada animasi berjalan, tidak ada elemen yang disiapkan tersembunyi.
  - JavaScript mati: seluruh isi Beranda Galeri terlihat (judul, foto, statistik dengan angka akhir, kartu, wordmark); HTML server tanpa `data-reveal`.
  - Katalog: filter → crossfade hasil; kartu katalog → detail: View Transition dengan pasangan `karya-foto-<slug>` selesai tanpa error; back browser normal.
  - Ganti mode: penyingkapan 450 ms di `::view-transition-new(root)`, atribut dan gaya sementara dibersihkan.
  - Studio (sesi uji sementara di `galeri_dev`): Beranda tingkat Halus; navigasi ke Analitik menampilkan skeleton, pil meluncur, dan crossfade; HP gelap: pil aktif bottom nav benar.
  - Menu Tampilan: Studio Mati + Galeri Halus → Simpan → Studio `data-motion="off"` (durasi 0) dan Galeri `subtle`; Reset → kembali Penuh/Halus dan baris tema terhapus (sebelum uji memang tanpa baris).
- **Performa:** Lighthouse resmi BELUM dijalankan (paket `lighthouse` tidak terpasang; unduhan lewat `npx` di sesi ini ditolak sistem izin). Pengganti: Chrome lokal + DevTools Protocol, HP 412×823, CPU 4×, jaringan ±Slow 4G, cache mati, 5 kali per halaman, skor perkiraan dari bobot Lighthouse v12 tanpa Speed Index (throttling diterapkan langsung, biasanya lebih berat dari simulasi Lighthouse). Median:

  | Halaman | Skor perkiraan | LCP | TBT | CLS muat / gulir |
  | --- | --- | --- | --- | --- |
  | Beranda | 91 | 1,6 s | 325 ms | 0 / 0 |
  | Katalog | 91 | 1,7 s | 325 ms | 0 / 0 |
  | Detail | 92 | 1,4 s | 305 ms | 0 / 0 |

  Sebelum perbaikan observer, Beranda TBT 437 ms (skor 88); Beranda dengan animasi Mati 308 ms; Tentang 394 ms. Accessibility dan SEO tidak terukur dengan cara ini. Perintah Lighthouse resmi untuk pengguna (Galeri saja, setelah `npm run build` + `npx next start -p 3100`): `npx lighthouse@12 http://localhost:3100/ --form-factor=mobile --only-categories=performance,accessibility,seo --view`.
- Beranda Studio: TTFB ±100 ms, `load` ±350 ms (target < 1 detik).

**Review subagent baru (28 Nov 2026) dan tindak lanjutnya**

- **Yang sudah baik:** kurangi gerakan dihormati di semua jalur (skrip awal, `MotionRoot`, variabel Mati, cadangan `@media` View Transitions, dnd-kit, Recharts, lightbox, ganti mode); tanpa JS tidak ada isi tersembunyi; nama View Transition unik per halaman; migrasi v1 → v2 dan skrip awal dites.
- **[Tinggi] Fokus keyboard bisa jatuh ke elemen yang belum muncul** (Firefox, tautan "Lihat semua karya" di pita bawah layar): diperbaiki, elemen muncul seketika saat menerima fokus (`focusin`) dan CSS `:focus-within` menjaga cincin fokus terlihat.
- **[Sedang] Keputusan awal memakai area pemicu yang dipotong 8 %** (kartu di pita bawah layar berkedip hilang; elemen kecil di ujung halaman tidak pernah muncul): diperbaiki dengan layar asli + pemicu tanpa potongan.
- **[Sedang] `CountUp` menampilkan angka basi setelah nilai berubah ke 0 dan menghitung ulang setiap refresh:** diperbaiki (sekali per pemasangan, pembersihan menulis nilai terbaru).
- **[Rendah] diperbaiki:** kursor streaming AI maks. 5 kedip (WCAG 2.2.2); toast Sonner memakai durasi cepat (Sonner melepas toast 200 ms setelah keluar); empat bilah progres lama `transition-[width]` (unggah foto karya/proyek/profil, biaya AI) jadi `scaleX`, `Switch` tanpa `transition-all`; spinner "Muat lagi" hanya berputar saat memuat; token grafik dibaca sekali per tingkat (`useMemo`); tema v1 yang semua durasinya 0 menjadi tingkat Mati, jeda ditulis 0 jika durasi sedang dan lambat 0, dan menu Tampilan memberi peringatan untuk kombinasi itu; contoh pratinjau dipasang ulang setelah hidrasi dengan tingkat sebenarnya; status memuat di luar wadah `aria-busy`; fokus pindah ke kartu saran tetangga setelah satu kartu disembunyikan; `switchModeWithReveal` tidak lagi membaca `matchMedia` sendiri (`canRevealModeSwitch`, murni + test); efek `clip` Reveal yang tidak dipakai dihapus.
- **Test statis bertambah:** transisi properti layout (`transition-all`, `transition-[width]` …), `animate-pulse`, dan durasi ms di string inline ditolak.
- **Dicatat, tidak dikerjakan:**
  - Klik dalam ±400 ms saat transisi halaman (atau 450 ms saat foto melebar) tidak sampai ke halaman, karena isi template menjadi elemen bernama selama transisi. Diterima karena durasinya pendek.
  - Penyingkapan melingkar ganti mode tetap dipakai di tingkat Halus (Studio), dengan durasi sedang. A7 tidak membedakan tingkat, dan efek ini bukan geser.
  - Spinner `animate-spin` bawaan tetap berputar di tingkat Mati sebagai umpan balik fungsional, lalu berhenti saat kurangi gerakan.
  - Skala zoom lightbox (`ORIGIN_*`) dan batas hitung naik 2 detik ditulis tetap di TS.
  - Fokus jatuh ke `body` jika tautan "Hapus filter" katalog hilang setelah filter dihapus. Perilaku ini sudah ada sebelum Fase 7.
  - Saat pindah antarsisi Galeri ↔ Studio, animasi keluar halaman lama memakai tingkat sisi baru.
  - Di grafik, pemuatan halaman penuh tidak beranimasi (tingkat baru diketahui setelah hidrasi). Navigasi client tetap beranimasi.
- **Data uji dibersihkan:** sesi uji dan karya contoh (`scripts/demo-gallery.ts --hapus`) dihapus dari `galeri_dev`; tema tetap tanpa baris (tampilan awal). Build `.next` lokal masih berisi halaman Galeri dengan karya contoh sampai build berikutnya.
