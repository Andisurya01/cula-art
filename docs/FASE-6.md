# Fase 6: Tampilan (sistem desain, mode gelap/terang, kustomisasi tema)

Status: selesai 25 Nov 2026 (lihat "Hasil dan keputusan implementasi"). Deploy ke VPS masih menunggu domain dan VPS dari pengguna.

Mulai fase ini, fokus proyek adalah **penyempurnaan tampilan** (keputusan pengguna 25 Nov 2026). Toko dipindah menjadi Fase 8, dan Fase 7 berisi animasi dan detail interaksi.

Tujuan:
- Galeri dan Studio memakai bahasa visual baru dari referensi pengguna, dalam mode terang dan gelap.
- Semua properti visual (warna per mode, font, ukuran dan ketebalan teks h1-h6, radius, durasi animasi) berasal dari **token tema** yang bisa diubah di menu baru **Tampilan**.
- Token tersimpan di database, dan ada tombol reset ke tampilan awal.

## Referensi visual

Pengguna melampirkan dua referensi (25 Nov 2026):

1. **"AKA"** (dashboard kursus 3D) → acuan untuk **Studio**:
   - latar abu muda dengan kontainer putih;
   - navigasi berbentuk pil;
   - kartu bento radius besar (±28 px);
   - kartu aksen berwarna (biru terang, lime, abu gelap) untuk angka penting;
   - tombol hitam dan putih;
   - font sans geometris.
2. **"Euronium"** (landing page registri alam) → acuan untuk **Galeri**:
   - latar off-white;
   - judul sangat besar dengan tracking rapat dan **dua warna** (baris pertama hitam, baris kedua abu);
   - label kecil huruf kapital (mis. "PUBLIC REGISTRY · EST. 2026", "(01)");
   - tombol pil hitam dengan ikon ↗ dan tombol pil abu muda;
   - kartu putih radius besar;
   - pil statistik dengan gradien halus;
   - foto subjek besar yang "keluar" dari bingkai;
   - wordmark raksasa di footer.

## Scope

**Masuk Fase 6:**

- **Mesin tema:** token, nilai default, preset, validasi, pembangun CSS, cek kontras, dan penyimpanan di database.
- **Mode terang/gelap** di Galeri (tombol baru di header) dan Studio (tombol sudah ada), tanpa kedip tema saat halaman dimuat.
- **Menu baru Tampilan** `/studio/tampilan`:
  - warna per mode, tipografi, bentuk, dan token animasi;
  - pratinjau langsung;
  - preset;
  - Simpan, Batalkan perubahan, dan **Reset ke tampilan awal**.
- **Komponen dasar** (Shadcn/ui) dan komponen baru (judul dua warna, label bagian, tombol panah, pil statistik, kartu bento) membaca token.
- **Redesain** semua halaman Galeri, kerangka Studio, Beranda Studio, halaman login, dan penyesuaian semua menu Studio lainnya.
- Halaman offline PWA dan gambar Open Graph dengan gaya baru.

**Tidak masuk:**
- animasi baru (Fase 7; tokennya disiapkan sekarang);
- tema berbeda untuk Galeri dan Studio;
- warna grafik yang bisa diubah;
- unggah font sendiri;
- impor/ekspor tema terpisah (tema ikut ekspor JSON Fase 5);
- Toko.

## Keputusan

Rekomendasi sesi utama yang mengikuti referensi. Jika saat mengerjakan ada keputusan lain yang mengubah PRD, tanyakan dulu ke pengguna.

| No | Topik | Keputusan |
| --- | --- | --- |
| T1 | Satu tema | Satu set token untuk Galeri dan Studio. Warna diatur per mode (terang dan gelap); tipografi, bentuk, dan animasi sama untuk kedua mode. Galeri memakai skala besar (display, h1, h2), dan judul halaman Studio memakai skala h3. |
| T2 | Font | Fraunces (serif) diganti sans grotesk. Default: judul **Inter Tight** (500, tracking rapat), isi **Inter**, angka/kode Geist Mono. Pilihan font dibatasi daftar terkurasi lewat `next/font` (di-host sendiri, tanpa request ke Google saat dipakai): Inter, Inter Tight, Geist, Plus Jakarta Sans, Manrope, DM Sans, Space Grotesk, Instrument Serif. Hanya font default yang di-preload; font lain diunduh browser hanya jika dipilih. |
| T3 | Warna | Kode hex `#RRGGBB` (mudah untuk color picker dan cek kontras). Token per mode: latar, permukaan/kartu, teks, teks redup, **judul baris kedua** (abu dua warna), garis, input, fokus, primer, sekunder, aksen, destruktif, dan 4 warna kartu bento (biru, lime, ungu, gelap), masing-masing dengan pasangan teksnya. Default ada di tabel di bawah. |
| T4 | Kontras | Setiap pasangan teks/latar diberi rasio WCAG di menu Tampilan. < 4,5:1 untuk teks biasa (dan < 3:1 untuk judul baris kedua yang selalu besar) memunculkan peringatan, tetapi tidak memblokir. Nilai default lolos semua. |
| T5 | Bentuk | Radius per komponen: kartu, kartu bertingkat, tombol (pil atau px), input, badge, gambar, dialog/sheet. Default mengikuti referensi: tombol dan badge pil, kartu 28 px. |
| T6 | Tipografi | Per level (display, h1-h6): ukuran desktop dan HP (px, dirender sebagai `clamp()`), ketebalan, line-height, letter-spacing. Teks isi: besar, dasar, kecil, keterangan. Label: ukuran, ketebalan, huruf kapital ya/tidak, tracking. |
| T7 | Animasi | Token durasi (cepat/sedang/lambat) dan easing (dipilih dari daftar, bukan teks bebas) disimpan sekarang dan dipakai transisi yang sudah ada. Animasi baru di Fase 7. `prefers-reduced-motion` selalu dihormati. |
| T8 | Penyimpanan | Tabel `ThemeSetting` satu baris: `version` + `tokensJson`. Default dan preset ada di kode. "Batalkan perubahan" kembali ke versi tersimpan; **Reset ke tampilan awal** mengembalikan default (dengan konfirmasi). |
| T9 | Keamanan CSS | Token divalidasi Zod ketat di client dan server: hex, angka dalam rentang, dan enum untuk font/easing. CSS dibangun hanya dari daftar variabel yang dikenal, jadi tidak ada teks bebas yang masuk ke CSS. Test memakai payload jahat (`red;}body{…`). Hanya admin (`requireAdmin()`) yang bisa menyimpan. |
| T10 | Penerapan | Variabel CSS dirender server sebagai `<style>` di root layout, sehingga tidak ada kedip saat halaman dimuat. Menyimpan tema me-revalidate seluruh situs, termasuk Galeri yang di-cache. Tailwind 4 (`@theme inline`) memetakan token ke utility (`rounded-card`, `text-h1`, `bg-bento-lime`, `font-heading`, `duration-base`, …). |
| T11 | Mode untuk pengunjung | Default mengikuti sistem, dengan tombol ganti mode di header Galeri. Pilihan disimpan di browser (localStorage `next-themes`, bukan cookie, sesuai PRD "Galeri tidak memasang cookie"). Menu Tampilan bisa mengatur mode default: sistem/terang/gelap. |
| T12 | Preset | Dua preset bawaan: **Monokrom** (ala Euronium, default) dan **Bento** (ala AKA, aksen biru dan lime lebih menonjol). Memilih preset mengisi semua nilai, yang tetap bisa diubah sebelum disimpan. |
| T13 | Warna grafik | Palet grafik Fase 4 (tervalidasi skill `dataviz`) tetap dan tidak ikut kustomisasi. Palet ini dicek ulang terhadap permukaan default baru di kedua mode. |
| T14 | Di luar database | Halaman offline PWA (statis) dan gambar Open Graph tidak membaca database. Keduanya memakai nilai default dengan gaya baru. |
| T15 | Ekspor | Ekspor JSON Fase 5 ikut memuat `ThemeSetting`. |

### Nilai default (preset Monokrom)

Titik awal. Boleh disesuaikan saat review visual, selama tetap lolos kontras (T4).

| Token | Terang | Gelap |
| --- | --- | --- |
| Latar | `#F5F5F3` | `#0B0B0C` |
| Permukaan/kartu | `#FFFFFF` | `#161618` |
| Teks | `#0A0A0A` | `#F5F5F3` |
| Teks redup | `#6B6B6B` | `#9A9A9F` |
| Judul baris kedua | `#8A8A8A` | `#6E6E73` |
| Garis / input | `#E4E4E1` | `#2A2A2E` |
| Primer / teks primer | `#0A0A0A` / `#FFFFFF` | `#F5F5F3` / `#0A0A0A` |
| Sekunder / teksnya | `#ECECEA` / `#0A0A0A` | `#242427` / `#F5F5F3` |
| Aksen (ungu) / teksnya | `#6E4FD8` / `#FFFFFF` | `#9B83F0` / `#0A0A0A` |
| Destruktif | `#D92D20` | `#F04438` |
| Bento biru / teks | `#1463FF` / `#FFFFFF` | `#1463FF` / `#FFFFFF` |
| Bento lime / teks | `#C6F432` / `#0A0A0A` | `#C6F432` / `#0A0A0A` |
| Bento ungu / teks | `#6E4FD8` / `#FFFFFF` | `#7B5FE6` / `#FFFFFF` |
| Bento gelap / teks | `#23252B` / `#F5F5F3` | `#23252B` / `#F5F5F3` |

| Level | Desktop / HP (px) | Tebal | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| Display (hero Galeri) | 112 / 52 | 500 | 0,95 | -0,045em |
| h1 | 72 / 40 | 500 | 1,0 | -0,04em |
| h2 | 48 / 32 | 500 | 1,05 | -0,035em |
| h3 | 32 / 24 | 500 | 1,15 | -0,02em |
| h4 | 24 / 20 | 500 | 1,25 | -0,01em |
| h5 | 18 / 17 | 600 | 1,35 | 0 |
| h6 | 15 / 15 | 600 | 1,4 | 0 |
| Isi besar / dasar / kecil / keterangan | 18 / 16 / 14 / 12 | 400 | 1,5 | 0 |
| Label | 11 | 500 | 1,2 | 0,06em, huruf kapital |

Radius: kartu 28 px, kartu bertingkat 20 px, tombol dan badge pil, input 14 px, gambar 24 px, dialog/sheet 28 px.

Animasi: cepat 150 ms, sedang 250 ms, lambat 450 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`.

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md (bagian "Tampilan dan tema"), dan docs/FASE-6.md sampai habis. Lihat juga "Hasil dan keputusan implementasi" di docs/FASE-2.md (Galeri) dan docs/FASE-4.md (grafik). Kerjakan Fase 6 sesuai checklist di docs/FASE-6.md.
Langkah 1-4 kamu kerjakan sendiri. Lalu pakai subagent paralel untuk langkah 5-8 (satu agent per area, hanya menyentuh folder fitur dan route-nya sendiri). Terakhir langkah 9-10, lalu centang checklist di file ini.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. Mesin tema `src/lib/theme/`** (fungsi murni + test).
  - `schema.ts` (Zod, `version: 1`), `defaults.ts` (preset Monokrom dan Bento), `css.ts` (token → string CSS `:root` / `.dark` + utility tipografi), `contrast.ts` (rasio WCAG), `fonts.ts` (daftar terkurasi → variabel `next/font`).
  - Test:
    - CSS deterministik;
    - payload jahat ditolak, dan tidak ada nilai di luar daftar yang masuk CSS;
    - rasio kontras pasangan yang diketahui (hitam/putih 21:1);
    - semua pasangan default lolos T4;
    - `clamp()` benar;
    - reset = default.
- [x] **2. Schema, data, dan penerapan.**
  - Migrasi `ThemeSetting` (cara `prisma migrate diff` di `CLAUDE.md`).
  - `src/features/theme/`: `getTheme()` (sekali per request, fallback default jika baris belum ada/tidak valid), `saveTheme`, `resetTheme` (diawali `await requireAdmin()`, revalidate seluruh situs).
  - Root layout: `<style>` token + kelas variabel font + `defaultTheme` `next-themes` dari tema. Tidak ada kedip mode atau font saat dimuat.
  - `globals.css`: token Shadcn lama diganti token tema; `@theme inline` memetakan semua utility (T10). Fraunces dihapus.
  - Ekspor JSON memuat `ThemeSetting` (T15).
  - `routes.studio.appearance` (`/studio/tampilan`) dan entri menu Tampilan di sidebar dan "Lainnya" (ikon palet, setelah Pengaturan).
- [x] **3. Komponen dasar** (`src/components/ui/` dan komponen bersama baru).
  - Button: varian primer (pil hitam), sekunder (pil abu), outline, ghost, dan opsi ikon ↗.
  - Card: radius token dan varian bento (biru, lime, ungu, gelap).
  - Input, Select, Textarea, Badge, Tabs (pil), Dialog/Sheet, Dropdown, Tooltip, dan Sonner membaca token.
  - Komponen baru: `TwoToneHeading`, `SectionLabel` (label kapital + nomor "(01)"), `ArrowLink`, `StatPill`, `BentoCard`, `ThemeModeToggle` (dipakai Galeri dan Studio).
  - Ganti warna hardcode (mis. `text-emerald-600`, `amber`) di komponen bersama dengan token.
- [x] **4. Halaman contoh komponen** di dalam menu Tampilan (bagian pratinjau). Halaman ini sekaligus menjadi acuan visual bagi agent fitur. Ambil screenshot terang/gelap sebagai baseline.

### Fitur (boleh paralel dengan subagent; hanya folder sendiri, fondasi di atas hanya dibaca)

- [x] **5. Menu Tampilan** (`src/features/theme/components/`, `studio/(app)/tampilan/`).
  - Bagian:
    - **Mode & preset:** mode default pengunjung, pilih preset;
    - **Warna:** tab Terang | Gelap, dikelompokkan Dasar / Aksi / Bento / Judul dua warna; color picker native + input hex; lencana kontras per pasangan;
    - **Tipografi:** font judul dan isi, tabel display/h1-h6, teks isi, label;
    - **Bentuk:** radius per komponen, tombol pil ya/tidak;
    - **Animasi:** durasi dan easing; catatan bahwa animasi lengkap hadir di Fase 7.
  - Pratinjau langsung (variabel CSS hanya di kontainer pratinjau, belum mengubah situs), pilihan pratinjau terang/gelap dan lebar desktop/HP. Pratinjau berisi contoh hero Galeri, kartu karya, tombol, form, dan kartu bento Studio.
  - Tombol Simpan, Batalkan perubahan, dan **Reset ke tampilan awal** (konfirmasi). Peringatan jika meninggalkan halaman dengan perubahan belum tersimpan.
  - Nyaman di 375 px: bagian dilipat, pratinjau di atas atau lewat tombol.
- [x] **6. Galeri** (`src/features/gallery/components/`, `app/(galeri)/`), gaya Euronium:
  - **Header:** nama situs, navigasi, tombol mode, tombol menu bulat di HP.
  - **Beranda:**
    - hero judul display dua warna + label meta ("KARYA GAMBAR & CLAY · SEJAK {tahun}") + tombol pil ↗;
    - foto karya unggulan besar;
    - bagian bernomor "(01)";
    - pil statistik (jumlah karya, medium, tahun berkarya);
    - karya unggulan dan terbaru, pintasan medium, profil singkat.
  - **Katalog:** filter berbentuk pil dan kartu produk dengan radius gambar token.
  - **Detail karya:** galeri foto, kartu info gaya "Proof of life" (thumbnail, judul, meta, tombol pil **Tanya karya ini ↗** + pil **Bagikan**), cerita, proses, karya lain.
  - **Tentang, footer** (wordmark nama situs raksasa + kolom tautan), dan **404**.
  - Lighthouse Galeri tetap ≥ 90.
- [x] **7. Kerangka Studio + Beranda + login** (`src/components/layout/`, `src/features/home/`, `studio/(app)/page.tsx`, `app/masuk/`), gaya AKA:
  - sidebar dan bottom nav dengan status aktif berbentuk pil;
  - judul halaman;
  - Beranda bento: progres minggu ini (kartu gelap/biru), streak (kartu lime), saran, tugas hari ini, metrik tertunda, grafik mini;
  - halaman login dua langkah.
- [x] **8. Menu Studio lainnya** (lapisan tampilan saja, tanpa mengubah logika): ide, pipeline, kalender, proyek, karya, postingan, analitik, eksperimen, review, pengaturan.
  - Ganti warna dan radius hardcode dengan token.
  - Rapikan kartu, tabel, form, dan badge mengikuti komponen dasar.
  - Grafik tetap memakai palet T13.

### Penutup (sesi utama)

- [x] **9. Integrasi.**
  - Halaman offline PWA dan gambar Open Graph bergaya baru (T14).
  - Teks dan tautan menu Tampilan di README.
  - Cek tidak ada lagi Fraunces atau warna hardcode tersisa (`rg` untuk `#`, `oklch(`, dan nama warna Tailwind di `src/`, kecuali palet grafik dan pengecualian yang dicatat).
- [x] **10. Verifikasi dan dokumentasi.**
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos. Test statis `requireAdmin` mencakup aksi dan halaman baru.
  - **Uji visual:** screenshot setiap halaman Galeri dan Studio di terang dan gelap, desktop dan 375 px, dibandingkan dengan referensi. Tidak ada overflow horizontal.
  - **Uji kustomisasi:**
    - ubah primer, satu warna bento, radius kartu, font judul, dan ukuran h1, lalu Simpan → Galeri (termasuk halaman yang di-cache) dan Studio berubah;
    - Batalkan mengembalikan versi tersimpan, dan Reset mengembalikan default;
    - kontras buruk memunculkan peringatan;
    - payload jahat dari luar form ditolak server;
    - tanpa login, menu dan aksi ditolak.
  - **Tanpa kedip:** muat ulang di mode gelap; mode, font, dan warna benar sejak frame pertama.
  - **Font:** di tab jaringan hanya file font yang dipakai yang diunduh.
  - Review oleh subagent yang belum melihat kode: konsistensi visual dengan referensi, aksesibilitas (kontras, fokus, ukuran sentuh), keamanan CSS token, dan Galeri tidak bocor data.
  - Perbarui PRD (T1-T15 dan hasil implementasi), README, dan `CLAUDE.md`. Centang checklist ini dan tulis "Hasil dan keputusan implementasi".
  - Daftar file per modul + pesan commit dalam format PowerShell (`git add ...; if ($?) { git commit -m "..." }`) untuk di-commit pengguna.

## Definisi selesai

- Galeri dan Studio tampil dengan bahasa visual referensi, rapi di terang dan gelap, desktop dan HP.
- Semua warna, font, ukuran teks, radius, dan durasi berasal dari token tema (kecuali palet grafik).
- Menu Tampilan bisa mengubah dan menyimpan tema, dengan pratinjau langsung, Batalkan, dan Reset ke tampilan awal.
- Tema yang disimpan berlaku di seluruh situs tanpa kedip, dan input berbahaya tidak bisa masuk ke CSS.
- Lint, typecheck, test, dan build lolos; checklist dicentang; temuan review ditindaklanjuti atau dicatat.

## Catatan

- Tidak ada paket atau layanan pihak ketiga baru yang direncanakan. Color picker memakai `<input type="color">` native, dan font lewat `next/font` yang di-host sendiri.
- Subagent fitur (langkah 5-8) tidak menjalankan `npm run build` (berbagi `.next`) dan memakai `TEST_DB_NAME` sendiri untuk test integrasi. Agent langkah 8 hanya mengubah kelas/markup tampilan; perubahan logika dilaporkan, bukan dikerjakan.
- Fase 7 (animasi dan detail interaksi) akan memakai token animasi dari fase ini.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis di T1-T15.

**Fondasi (langkah 1-4, sesi utama)**

- **Token tambahan (perluasan T3):** `success` dan `warning` per mode, untuk mengganti warna amber/emerald yang tersebar di Studio dan badge ketersediaan Galeri. Ikut cek kontras (≥ 4,5:1 di kartu). Default gelap `#47CD89`/`#FDB022`.
- **Nilai default disesuaikan:** warna status digelapkan/diterangkan sampai lolos 4,5:1 di latar polos DAN di latar tipis 15% (badge, tombol destruktif): terang destruktif `#A8221A` (bukan `#D92D20`), sukses `#05603A`, peringatan `#93370D`; gelap destruktif `#FF7A70`. Pemeriksa kontras ikut mengecek 9 pasangan latar tipis. Fokus (`ring`) = ungu aksen (`#6E4FD8` / `#9B83F0`), dicek ≥ 3:1 terhadap latar. Tombol default pil; radius tombol/badge non-pil default 12/8 px.
- **Pasangan kontras:** teks dan teks redup di latar/kartu/sekunder, judul baris kedua di latar dan kartu (≥ 3:1), teks primer/sekunder/aksen, destruktif/sukses/peringatan, keempat bento, dan fokus (≥ 3:1). Rasio ditampilkan dibulatkan ke bawah (4,49 tidak tampil 4,5).
- **CSS:** `buildThemeCss` → `:root` (warna terang + variabel bersama), `.dark` (warna gelap), dan `@media (prefers-reduced-motion)` yang membuat durasi 0. Nama variabel hanya dari konstanta; setiap nilai lolos schema lalu dicek ulang dengan pola karakter aman (tanpa `;{}<>` atau kutip). Alias Shadcn (`--popover` = kartu, `--muted` = sekunder) ditulis builder, bukan `var()` di CSS, supaya ikut berganti di kontainer pratinjau.
- **Ukuran fluid:** `clamp()` dalam rem, tepat ukuran HP di lebar 375 px dan ukuran desktop di 1280 px. Ukuran HP boleh lebih besar dari desktop (kemiringan negatif tetap valid).
- **Warna media:** `--media`/`--media-foreground` = latar dan teks palet gelap, sama di kedua mode, untuk lightbox dan teks di atas foto.
- **Skala Tailwind lama ikut token** (bukan dihapus): `text-xs/sm/base/lg` = teks isi (tanpa ketebalan, supaya tetap mewarisi), `text-xl` = h5, `2xl` = h4, `3xl/4xl` = h3, `5xl` = h2, `6xl/7xl` = h1, `8xl/9xl` = display; `rounded-sm…lg` dari radius input, `xl/2xl` dari kartu bertingkat, `3xl/4xl` dari kartu. Kode baru memakai nama semantik.
- **`cn` dikonfigurasi** (`createCn` di `src/lib/utils.ts`) dengan ukuran, radius, font, durasi, dan easing tema. Tanpa ini `text-h1 text-muted-foreground` dianggap dua warna teks dan salah satunya dibuang. Semua import `cn` dari paket `"cn"` diganti `@/lib/utils`.
- **Varian `dark:`** = `.dark` atau di dalam `.dark`, kecuali di dalam `data-theme-preview="light"`, supaya pratinjau terang di dalam situs gelap benar.
- **Penyimpanan:** baca tidak pernah membuat baris; baris tidak ada, versi lain, atau JSON tidak valid → default (dengan `console.warn`). Simpan = upsert, P2002 dari simpan paralel pada tabel kosong ditangani sebagai update. Reset menghapus baris, jadi perbaikan default di kode ikut berlaku.
- **Font:** semua kelas variabel `next/font` dipasang di `<html>`, tetapi browser hanya mengunduh file font yang dipakai; hanya Inter Tight, Inter, dan Geist Mono yang di-preload. Font non-default yang dipilih belum di-preload (bisa swap singkat pada kunjungan pertama, lalu tersimpan di cache).
- **Halaman offline PWA dan gambar Open Graph (T14):** nilai default Monokrom. Open Graph = bidang latar tema dengan foto di bingkai radius besar, tanpa teks (tidak bergantung font di server). Service worker `studio-v3`, manifest `theme_color` `#0B0B0C`.
- **Palet grafik (T13):** dicek ulang dengan validator skill dataviz. Lolos di kartu terang `#FFFFFF`, gelap `#161618`, dan kartu gelap preset Bento `#1A1B20`. Di latar halaman `#F5F5F3`, oranye Instagram hanya 2,93:1, jadi grafik harus selalu di dalam kartu (sudah begitu, dan ada tabel kembaran).
- **Test statis baru:** `token-usage.static.test.ts` (tanpa hex, warna Tailwind bawaan, ukuran/radius/durasi arbitrer di `src/`), `fonts.static.test.ts` (instance next/font = daftar terkurasi, preload hanya default).
- **Tambahan setelah agent fitur:** Alert varian `warning`/`success`, Badge `size="sm"`, hover tombol ghost `bg-foreground/6` (terlihat juga di atas permukaan abu), teks tombol tutup "Tutup", utility `text-wordmark`. Perbaikan bug: `Button asChild` tanpa panah sempat crash ("Slot failed to slot") karena saudara `false`; kini anak diteruskan apa adanya, dijaga `button.test.ts`.

**Fitur (langkah 5-8, subagent paralel per area; langkah 8 dibagi dua agent)**

- **Menu Tampilan (5):** draf boleh sementara tidak valid (hex setengah diketik); pratinjau dan cek kontras memakai versi valid terakhir, Simpan memvalidasi ulang dan membuka bagian berisi kesalahan. Bar aksi menempel di atas (tidak bertabrakan dengan bottom nav). Lima bagian `<details>`; tabel tipografi jadi kartu per level di kontainer sempit. Pratinjau = kanvas 1280 px (desktop) atau 375 px (HP) dengan ukuran teks tetap level itu, diperkecil `zoom` sesuai kolom, supaya tata letak sama dengan situs di lebar tersebut. Di bawah `xl` pratinjau lewat Sheet. Penjaga perubahan belum tersimpan: `beforeunload` + klik tautan internal (AlertDialog); tombol back/forward browser tidak bisa dicegat (keterbatasan Next). Reset di kartu terpisah, aktif bila tema pernah disimpan atau draf ≠ default.
- **Galeri (6):** `getGalleryStats()` baru (hanya karya Terbit: jumlah, medium, tahun pertama/terakhir; test memastikan tanpa slug/judul/harga/id). Hero = nama situs + tagline (≤ 32 karakter) sebagai judul display dua warna, foto unggulan keluar dari bingkai kartu putih. Nomor bagian "(01)" dihitung ulang saat bagian kosong disembunyikan. Filter katalog medium/ketersediaan jadi pil radio (form GET tetap jalan tanpa JS). Kartu info detail gaya "Proof of life". Footer = kartu ajakan + kolom tautan + wordmark (`text-wordmark` untuk nama pendek, `text-display` untuk nama panjang). Lightbox `bg-media`.
- **Kerangka Studio (7):** sidebar panel putih mengambang, menu aktif pil primer 40 px; bottom nav bilah mengambang, sel 52 px. Tombol **+ Ide lime** (`bg-bento-lime`) supaya beda dari menu aktif yang hitam (menyimpang sedikit dari "tombol hitam dan putih"; satu konstanta `QUICK_IDEA_BUTTON_CLASS` di `studio-mark.tsx` jika ingin hitam). Grid Beranda memakai container query (lebar area isi, bukan layar). Progres minggu ini kartu biru, streak kartu lime, pipeline kartu gelap; grafik mini tetap di kartu permukaan (T13). Login: penanda dua langkah berbentuk pil, QR di `bg-media-foreground`.
- **Menu konten (8A):** kolom kanban kartu putih, kartu konten abu bertingkat; garis pilar jadi garis pendek di dalam kartu (`border-l-4` melengkung pada radius besar). Kalender dalam satu kartu putih, hari ini lingkaran primer. Badge platform: TikTok pil primer, Instagram pil garis (tanpa warna merek/seri grafik).
- **Menu data (8B):** status memakai varian Badge (metrik: menunggu outline, perlu diisi warning, lengkap success; eksperimen: didukung success, ditolak destructive). KPI Analitik bento hanya Total post (gelap) dan Rata-rata ER (lime); biru dihindari karena mirip seri TikTok. Pengaturan memakai Tabs pil yang bisa digeser di HP.

**Verifikasi (langkah 10, 25 Nov 2026)**

- `npm run lint`, `npm run typecheck`, `npm run test` (130 file, 1.441 test, termasuk integrasi ke `galeri_test`), dan `npm run build` lolos. Sebelumnya Next.js 16.4.3 kadang menghentikan build di akhir karena advisori keamanan (7 advisori moderat ≤ 16.4.4, antara lain cache `use cache`, SVG di image optimizer, dan injeksi respons self-hosted). Atas persetujuan pengguna, `next` dan `eslint-config-next` dinaikkan ke **16.4.6** (versi persis, lockfile hanya berubah di paket Next); tiga build berturut-turut lolos dan `npm audit` tidak lagi melaporkan `next`. Temuan audit lain hanya di CLI pengembangan (prisma, shadcn, typescript-eslint), tidak diubah.
- **Uji visual** (build produksi lokal, data contoh): Galeri dan Studio di terang dan gelap, 1280/1440 px dan 375 px. Tanpa overflow horizontal di 375 px pada 24 halaman: `/`, `/karya`, detail karya, `/tentang`, 404, `/masuk`, dan semua menu Studio termasuk detail konten, proyek, karya, pratinjau karya, post, dan Tampilan.
- **Uji kustomisasi:** primer `#1463FF`, bento lime, radius kartu 12 px, font judul Space Grotesk, h1 desktop 80 px → Simpan → `<style>` di `/`, `/karya`, detail karya, `/tentang` (di-cache), `/masuk`, dan Studio langsung berubah. Batalkan mengembalikan versi tersimpan (h1 80), Reset (dengan konfirmasi) mengembalikan default di seluruh situs. Teks redup `#CCCCCC` memunculkan peringatan 3 pasangan kontras, tanpa memblokir Simpan. Payload jahat dari luar form dan aksi tanpa login ditolak (test integrasi `actions.int.test.ts`); `/studio/tampilan` tanpa sesi dialihkan ke login.
- **Tanpa kedip:** `<style id="theme-tokens">` ada di `<head>` HTML server, skrip mode next-themes jalan sebelum isi halaman.
- **Font:** setelah memilih Space Grotesk, halaman Galeri hanya mengunduh 4 file font (3 default yang di-preload + Space Grotesk); lima font lain di daftar tidak diunduh.

**Review subagent baru (25 Nov 2026) dan tindak lanjutnya**

- **Keamanan CSS token dan batas data Galeri: tanpa celah.** Payload jahat (hex dengan CSS/newline/8 digit, kunci asing, `__proto__`, font/easing di luar daftar, NaN/Infinity, string angka) ditolak; 20.000 token acak yang lolos schema tidak pernah membuat `buildThemeCss` gagal. `getGalleryStats` hanya agregat karya Terbit.
- **[Sedang] Teks status di latar tipis < 4,5:1** (badge warning/destructive, tombol destruktif `/10`, AlertDialog destruktif di mode gelap), padahal pemeriksa kontras lolos: warna status default diubah (lihat di atas) dan `CONTRAST_PAIRS` kini mengecek status di atas campuran 15% di latar, kartu, dan sekunder.
- **[Sedang] Cincin fokus 50% hanya ±2,1:1:** semua `ring-ring/50` dan `outline-ring/50` jadi warna penuh (cek "Fokus di latar" ≥ 3:1 kini sesuai yang dipakai); fokus tombol destruktif `ring-destructive` penuh.
- **[Sedang] Pratinjau di HP terkunci di kanvas desktop (teks ±4 px):** pilihan lebar tampil di semua ukuran, dan tombol Pratinjau di layar < 640 px membuka lebar HP.
- **[Rendah] Tanpa indikator fokus di Windows High Contrast:** semua `outline-none` jadi `outline-hidden` (Tailwind menambah cadangan `forced-colors`).
- **[Rendah]** petunjuk `StatPill` di atas ujung gradien ±3,5:1 → warna teks penuh; batas judul baris kedua kini 3:1 hanya bila display-h3 selalu teks besar di HP (≥ 24 px, atau ≥ 18,66 px tebal), selain itu 4,5:1, dan `TwoToneHeading` dibatasi display-h3; isian radius yang dinonaktifkan saat pil aktif tidak lagi bisa menahan Simpan; bilah aksi Tampilan tidak lagi menimpa sidebar di 768-1023 px; kanvas pratinjau `inert` (tidak ikut urutan Tab dan pembaca layar) dengan `color-scheme` sesuai mode pratinjau.
- **[Info]** `/masuk` kini punya `<h1>` (`CardTitle as="h1"`); `getTheme()` memakai tampilan awal bila database error (halaman lain yang butuh DB tetap gagal sendiri).
- **Dicatat, tidak dikerjakan:** test token belum menangkap warna bernama di nilai arbitrer (`bg-[red]`), `style={{ color }}`, atau `leading-[..]`/`tracking-[..]` (saat ini tidak ada pemakaian); `font-medium` pada judul kartu menimpa ketebalan token (sama dengan default 500); judul di dalam `<summary>` editor kurang ideal untuk navigasi heading pembaca layar; label meta Galeri abu (referensi hitam) sengaja dipertahankan sebagai hierarki; aria-label sel kalender bulan di HP ikut menghitung slot kosong (perilaku lama).
