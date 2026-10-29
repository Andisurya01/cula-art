# Fase 2: Galeri + Auth

Status (29 Okt 2026): langkah 1-10 dan 12 selesai; langkah 11 dokumen siap (`docs/DEPLOY.md`), eksekusi di VPS menunggu domain + VPS dari pengguna.

Tujuan: Studio terkunci di balik login di `/studio`, karya bisa dikelola dan diterbitkan, Galeri publik live di satu domain.

## Keputusan (28 Oktober 2026, mengikuti rekomendasi)

| Topik | Keputusan |
| --- | --- |
| Nama | Tetap sementara "Galeri & Studio Karya". Disimpan di `Setting.siteName`, jadi bisa diganti dari Pengaturan tanpa ubah kode. Domain ditentukan sebelum langkah deploy. |
| Hosting | VPS + PostgreSQL + Caddy (HTTPS otomatis) + backup harian database dan `uploads/`. |
| Database dev | Pindah ke PostgreSQL juga, karena migrasi Prisma terikat ke satu provider. Database baru `galeri_dev` dan `galeri_test` dengan role `galeri` di cluster PostgreSQL 18 lokal yang sudah ada (pola sama dengan POS). Migrasi SQLite Fase 1 diganti satu migrasi awal PostgreSQL; `dev.db` hanya berisi data uji, jadi tidak dipindahkan. |
| Bahasa Galeri | Indonesia saja. Teks Galeri dikumpulkan di satu tempat supaya bahasa Inggris mudah ditambah nanti. |
| Harga | Diatur per karya (`showPrice`); default "Harga atas permintaan". |
| Kontak | Utama WhatsApp (pesan otomatis berisi judul + tautan karya), cadangan email. |
| Halaman Tentang | Masuk Fase 2. |
| 2FA | Wajib (TOTP, aplikasi authenticator) + 10 kode pemulihan. Reset darurat lewat skrip CLI di server. |
| Foto HEIC | Tidak didukung sharp. Andalkan konversi otomatis iPhone/Safari ke JPEG saat unggah; jika tetap HEIC, tolak dengan pesan jelas. |
| Akun Instagram | Disarankan diubah ke Creator (gratis) sebelum Fase 4 (Data) supaya impor API memungkinkan. Ini tindakan pengguna, bukan kode. |

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md, dan docs/FASE-2.md sampai habis. Kerjakan Fase 2 sesuai checklist di docs/FASE-2.md.
Urutan: langkah 1-6 kamu kerjakan sendiri. Setelah itu pakai subagent paralel untuk langkah 7-10 (satu agent per area, masing-masing hanya menyentuh folder fitur dan route-nya sendiri). Langkah 11 (deploy) dikerjakan bersama saya. Terakhir jalankan langkah 12 dan centang checklist di file ini.
Tanyakan dulu jika ada keputusan yang mengubah PRD.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. PostgreSQL.**
  - Buat role `galeri` serta database `galeri_dev` dan `galeri_test` di PostgreSQL 18 lokal.
  - `provider = "postgresql"`. Hapus migrasi SQLite, buat migrasi awal baru, seed ulang.
  - `.env` sekarang berisi password, jadi **berhenti di-commit**: `.gitignore` mengecualikan `.env`, dan hanya `.env.example` (nilai contoh) yang di-commit.
  - Variabel lingkungan: `DATABASE_URL`, `DATABASE_URL_TEST`, `UPLOAD_DIR`, `SITE_URL`.
  - Perbarui README dan bagian Lingkungan di `CLAUDE.md`.
- [x] **2. Restruktur route.**
  - Pindahkan `src/app/(app)/*` ke `src/app/studio/(app)/*`. Beranda Studio jadi `/studio`.
  - Semua path internal (nav, `href`, `router.push`, `revalidatePath`) diambil dari satu modul `src/lib/routes.ts`, bukan string tersebar.
  - Root layout dibuat minimal. Provider Studio (TanStack Query, Tooltip, dialog + Ide) pindah ke layout Studio supaya Galeri tetap ringan.
- [x] **3. Auth.**
  - **Schema:** `AdminUser` (email, passwordHash, totpSecret, recoveryCodeHashes), `Session`, `LoginAttempt`.
  - **Inti di `src/features/auth/`:**
    - password scrypt;
    - sesi DB (token acak, hash di DB, cookie `httpOnly`/`Secure`/`SameSite=Lax`, 30 hari diperpanjang saat dipakai);
    - pembatasan login (5 gagal per 15 menit per IP dan per email);
    - TOTP RFC 6238 dengan `node:crypto` (test memakai vektor uji RFC) + paket `qrcode` untuk QR setup;
    - `requireAdmin()` (DAL, dibungkus `cache` untuk render).
  - **`src/proxy.ts`:** cek cepat cookie untuk `/studio/:path*`, arahkan ke `/masuk?next=...`.
  - **Halaman `/masuk`:** email + password, lalu kode 2FA (atau kode pemulihan). Login pertama wajib setup 2FA: tampilkan QR + 10 kode pemulihan sekali.
  - **Skrip CLI:** `npm run admin:create` dan `npm run admin:reset-2fa` (tsx, baca input dari terminal).
  - **Tab Pengaturan "Akun & keamanan":** ganti password, sesi aktif (perangkat, terakhir dipakai), cabut satu/semua sesi, buat ulang kode pemulihan, tombol Keluar.
  - **Pasang `await requireAdmin()`** di layout Studio, setiap halaman Studio, dan di baris pertama **setiap** Server Action yang sudah ada (ideas, contents, posts, calendar, projects, settings).
  - **Test:**
    - unit: hash/verify password, TOTP, logika lockout;
    - test statis: setiap `export async function` di `src/features/**/actions.ts` diawali `await requireAdmin()`;
    - `next/headers` di-mock untuk test sesi.
- [x] **4. Penyimpanan dan gambar.**
  - `src/lib/storage.ts`: simpan/baca/hapus di `UPLOAD_DIR` (default `./uploads`, di-gitignore), key acak.
  - `src/lib/images.ts`: sharp `rotate()` (orientasi EXIF), resize sisi terpanjang maks. 2400 px, WebP kualitas ~82, tanpa metadata. Cek tipe dari isi file (JPEG/PNG/WebP; tolak HEIC dan lainnya), maks. 15 MB.
  - Route Handler `/media/[...key]`: sajikan file dengan `Cache-Control: public, max-age=31536000, immutable`, tolak path traversal.
  - `next.config.ts` `images.localPatterns` untuk `/media/**`.
  - Test: EXIF/GPS hilang setelah diproses, path traversal ditolak.
- [x] **5. Schema karya dan profil.**
  - Model `Artwork`, `ArtworkImage`, `ArtworkContent`, `ArtworkSlugRedirect`, field profil di `Setting`, `storageKey` opsional di `ProjectPhoto` (sesuai PRD "Model data").
  - `src/lib/slug.ts` (slugify teks Indonesia, akhiran unik `-2`, `-3`) + test.
  - `src/features/gallery/queries.ts`: satu-satunya pintu data Galeri, DTO berisi field publik saja. Harga hanya dikirim jika `showPrice`.
  - `src/features/gallery/revalidate.ts` dipanggil semua aksi karya/profil.
  - Test integrasi ke `galeri_test`: karya Draft/Arsip tidak pernah muncul, harga tersembunyi tidak ada di DTO.
- [x] **6. Layout Galeri + header keamanan.**
  - `src/app/(galeri)/layout.tsx`: header (nama, menu, ikon sosial, hamburger di HP), footer, `not-found`.
  - Gaya lebih editorial daripada Studio: foto dominan, tipografi judul berbeda, banyak ruang kosong. Tetap token warna yang sama, terang/gelap.
  - Header keamanan di `next.config.ts`: CSP, `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options`. HSTS di Caddy.
  - `robots.ts` (larang `/studio`, `/masuk`, `/media` tidak perlu dilarang), `sitemap.ts` (Beranda, Katalog, Tentang, semua karya Terbit).

### Fitur (boleh paralel dengan subagent)

- [x] **7. Studio: Karya** (`src/features/artworks/`, `src/app/studio/(app)/karya/`).
  - Daftar (grid, filter publikasi/medium/ketersediaan) dan form detail semua field PRD menu 11.
  - Unggah banyak foto dengan progres, urutkan (dnd-kit + tombol), pilih cover, teks alternatif wajib.
  - Pilih konten Posted sebagai video proses.
  - Ketersediaan, harga + `showPrice`, Unggulan + urutan.
  - Slug bisa diubah; slug lama masuk `ArtworkSlugRedirect`.
  - Terbitkan/arsipkan dengan syarat terbit dicek server. Pratinjau `/studio/karya/[id]/pratinjau` memakai komponen detail Galeri.
  - Aksi `createArtworkFromProject(projectId)` diekspor untuk dipakai langkah 10.
- [x] **8. Galeri** (`src/features/gallery/components/`, `src/app/(galeri)/`).
  - **Beranda:** hero karya unggulan, grid unggulan, terbaru, pintasan medium, ringkasan profil.
  - **Katalog `/karya`:** grid 2/3-4 kolom, filter medium/ketersediaan/tahun + pencarian di URL, "Muat lagi" 24 per halaman.
  - **Detail `/karya/[slug]`:**
    - galeri geser + layar penuh;
    - panel info dan tombol WhatsApp (fallback email jika WA kosong);
    - cerita, proses (foto + tautan TikTok/IG), karya lain dengan medium sama, salin tautan;
    - redirect slug lama.
  - **Tentang `/tentang`.**
  - **Metadata per halaman:** Open Graph pakai cover, JSON-LD `VisualArtwork`.
  - Semua nyaman di 375 px; target Lighthouse ≥ 90.
- [x] **9. Pengaturan: Profil publik.** Tab baru: nama situs, tagline, bio, foto profil (unggah), kota, WhatsApp (format `62…`), email kontak, tautan Instagram/TikTok. Disimpan → revalidate Galeri.
- [x] **10. Proyek.**
  - Foto progres bisa diunggah (selain URL lama).
  - Tombol **Jadikan Karya** di detail proyek (memakai aksi dari langkah 7, lalu buka form karya).
  - Daftar karya yang berasal dari proyek.

### Deploy (sesi utama bersama pengguna)

- [ ] **11. Produksi.** _(dokumen, `deploy/`, dan `/api/health` selesai; sisa: eksekusi bersama pengguna)_
  - **Pengguna menyiapkan:** domain, VPS (Ubuntu LTS, region Singapura/Jakarta), akses SSH. Pembelian dan akun dilakukan pengguna sendiri.
  - **`docs/DEPLOY.md`:**
    - instalasi Node LTS, PostgreSQL, Caddy;
    - Caddyfile (HTTPS + HSTS + `encode`), service systemd untuk `next start`;
    - `prisma migrate deploy`, `npm run admin:create`;
    - folder `uploads/` di luar direktori rilis;
    - cron backup harian (`pg_dump` + salin `uploads/`) ke lokasi lain, dan uji pulihkan.
  - Skrip `npm run start` membaca `PORT`; endpoint `/api/health` untuk cek hidup.
  - Setelah live: buat akun admin + 2FA, isi profil publik, terbitkan minimal 1 karya, uji dari HP lewat domain.

### Penutup (sesi utama)

- [x] **12. Verifikasi dan dokumentasi.**
  - `npm run lint`, `npm run typecheck`, `npm run test` (termasuk test integrasi ke `galeri_test`), `npm run build` lolos.
  - **Uji manual:**
    - **Login:** salah 5× terkunci; 2FA dan kode pemulihan berfungsi; logout mencabut sesi.
    - **Akses tanpa login:** `/studio/*` dalam keadaan logout diarahkan ke `/masuk`.
    - **Unggah:** foto ber-GPS diunggah, lalu file hasil tidak punya EXIF.
    - **Publikasi:** terbitkan muncul di Galeri; Draft dan harga tersembunyi tidak ada di HTML Galeri.
    - **Galeri:** tombol WhatsApp membawa judul + URL; tiap halaman nyaman di 375 px.
  - Review keamanan oleh subagent yang belum melihat kode (auth, upload, kebocoran data Galeri).
  - Perbarui README (setup PostgreSQL, admin, struktur baru), `CLAUDE.md`, dan PRD jika ada penyimpangan. Centang checklist ini dan tulis bagian "Hasil dan keputusan implementasi".
  - Daftar file per modul untuk di-commit pengguna.

## Catatan

- sharp sudah terbukti jalan di laptop ini (binary `@img/sharp-win32-x64` tidak diblokir App Control) dan membuang EXIF secara default; tambahkan `sharp` sebagai dependency langsung.
- Paket baru yang diperkirakan: `sharp`, `qrcode` (+ `@types/qrcode`). Tidak ada layanan pihak ketiga.
- Halaman Studio tetap `force-dynamic`. Halaman Galeri boleh di-cache; pastikan setiap aksi yang mengubah karya/profil memanggil revalidate Galeri.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis eksplisit di PRD (PRD "Model data" sudah diperbarui untuk yang menyangkut data):

**Fondasi (langkah 1-6)**

- **Database:** migrasi `init` (setara Fase 1), `auth`, `gallery`. CHECK di DB: foto progres wajib punya `url` atau `storageKey`. `prisma migrate dev` menolak jalan non-interaktif saat ada peringatan data; migrasi `gallery` dibuat dengan `prisma migrate diff` lalu `migrate deploy` (cara ini dicatat di CLAUDE.md).
- **Test:** Vitest punya proyek `unit` dan `integration` (`*.int.test.ts`, berurutan, ke `galeri_test`; migrasi otomatis di global setup, nama DB wajib berakhiran `_test`). `TEST_DB_NAME` memakai DB test lain supaya run paralel tidak saling mengosongkan tabel. Semua test (termasuk unit) memakai `DATABASE_URL` test dan `UPLOAD_DIR` sementara per proses.
- **Route:** semua path dari `src/lib/routes.ts`. Beranda Studio aktif di nav hanya jika path persis `/studio`. `?next=` setelah login hanya menerima path `/studio…` relatif (cegah open redirect).
- **Login 2 tahap:** password benar membuat `LoginChallenge` (cookie `studio_login`, 10 menit), bukan sesi. Sesi penuh (`studio_session`, 30 hari, diperpanjang paling sering sekali per menit; cookie diperpanjang di `proxy.ts`) baru dibuat setelah kode 2FA/kode pemulihan. Kode TOTP yang sudah dipakai ditolak (`totpLastStep`). Kode pemulihan sha256, 10 karakter tanpa huruf mirip. Email tak terdaftar tetap menjalankan scrypt (waktu respons sama). Percobaan selama terkunci tidak dicatat, jadi kunci tidak bisa diperpanjang tanpa batas; login sukses mengosongkan hitungan. Kegagalan kode 2FA juga dihitung.
- **Sesi tidak berlaku** jika 2FA akun di-reset (`totpSecret` null). Ganti password mencabut sesi lain. `/masuk` tidak redirect di server bila sudah login (menampilkan "Kamu sudah masuk"), supaya kode pemulihan tetap tampil setelah setup 2FA.
- **Skrip CLI tambahan:** `npm run admin:reset-password` (lupa password). `admin:create` menolak jika akun sudah ada (satu pemilik). Input dari pipe didukung.
- **Proxy:** request Server Action tanpa cookie diteruskan (requireAdmin di aksi yang mengarahkan), supaya tidak terjadi redirect POST yang aneh. `requireAdmin()` juga dipanggil di `generateMetadata` halaman Studio.
- **Unggah:** Route Handler + XHR (Server Action dibatasi 1 MB, tanpa progres). `experimental.proxyClientMaxBodySize = "16mb"` karena proxy memotong body > 10 MB diam-diam. Input maks. 80 MP. Key file `<32 hex>.webp`, disimpan atomik. `/media/*` publik (key tidak bisa ditebak), cache 1 tahun immutable.
- **CSP** tanpa nonce (Galeri tetap bisa di-cache), dua varian: Galeri hanya gambar sendiri; Studio juga `https:` untuk foto URL lama Fase 1. Tanpa `upgrade-insecure-requests` (merusak `next start` lokal lewat http); HTTPS dan HSTS diurus Caddy.
- **Galeri:** layout `revalidate = 3600` sebagai cadangan; semua aksi karya/profil memanggil `revalidateGallery()`, dan perubahan konten/post juga (tautan video proses). Font judul Fraunces hanya dimuat di Galeri. Lucide v1 tanpa ikon brand, jadi ikon Instagram/TikTok SVG sendiri. 404 untuk URL tak dikenal memakai kerangka Galeri; Studio punya 404 sendiri.
- **Data publik:** harga ikut ke DTO hanya jika `showPrice` dan bukan Koleksi pribadi. Alt kosong diganti judul karya. `ArtworkImage.isProcess` memisahkan foto karya jadi dan foto proses (bagian Proses di detail). `Setting.aboutText` untuk cerita panjang halaman Tentang (bio tetap singkat). Filter katalog ketersediaan: Tersedia, atau Terjual/Koleksi (termasuk Dipesan). "Muat lagi" = halaman 1..N sekaligus (`?halaman=N`).

**Deploy (langkah 11, dokumen)**

- `docs/DEPLOY.md` + `deploy/` (Caddyfile, `galeri.service`, `galeri-backup.sh`). Node 24 LTS di server (Node 20 sudah EOL April 2026). Service menjalankan `next start` langsung dengan node (membaca `PORT`), hanya di 127.0.0.1, dengan `ProtectSystem=strict`. Salinan backup ke lokasi lain: pilihan pengguna (tarik ke laptop atau penyimpanan objek).
- `/api/health`: 200 jika DB siap, 503 tanpa detail error.

**Fitur (langkah 7-10, dikerjakan subagent paralel per area)**

- **Karya (7):** slug ikut judul selama karya belum pernah terbit (`publishedAt` null); setelah itu hanya berubah lewat edit manual, dan setiap ganti slug mencatat redirect (termasuk saat Draft). Kembali ke slug lama menghapus redirect-nya; slug/redirect milik karya lain ditolak. Karya Terbit dijaga tetap memenuhi syarat (medium/tahun dikosongkan, foto karya jadi terakhir dihapus/dipindah ke proses, atau alt dikosongkan → ditolak; foto baru tanpa alt boleh, Galeri memakai teks cadangan). Syarat alt berlaku untuk semua foto. Foto karya jadi pertama otomatis cover; "Jadikan cover" memindahkannya ke urutan pertama. Maks. 40 foto, 10 video proses. Harga menerima "1.500.000"/"Rp …", maks. Rp 2 miliar (kolom Int); `showPrice` aktif → harga wajib. Filter daftar `?publikasi=&medium=&ketersediaan=`. `createArtworkFromProject` menyalin FILE foto progres unggahan (key baru) sebagai foto proses, urut `takenAt`, caption → alt; foto URL dilewati.
- **Galeri (8):** hero = unggulan pertama berfoto (cadangan terbaru); unggulan di HP berupa baris geser. Kartu: badge ketersediaan di foto, baris harga hanya harga atau "Harga atas permintaan". Filter katalog = form GET biasa (jalan tanpa JS); canonical hanya `/karya` dan `/karya?medium=X`, kombinasi lain `noindex, follow`. Detail: bingkai foto rasio cover (dibatasi 3:4-4:3), layar penuh memuat file asli untuk zoom (ketuk 2,5×, cubit 1-4×). JSON-LD `VisualArtwork` tanpa Offer. Tanpa `loading.tsx` supaya 404/308 tetap kode HTTP asli. Data contoh: `npx tsx scripts/demo-gallery.ts` (`--hapus` untuk menghapus; slug `contoh-`).
- **Profil publik (9):** handle IG/TikTok kini hanya di tab Profil publik (tab lama bernama "Jadwal"). WhatsApp menerima `08…`/`+62 …` lalu disimpan `62…`; handle boleh berupa tautan profil yang ditempel. Foto profil tersimpan langsung saat diunggah (baris Setting dikunci saat mengganti supaya tidak ada file yatim).
- **Proyek (10):** dialog unggah: caption per foto, satu tanggal untuk semua (default hari ini), unggah berurutan, gagal bisa "Coba lagi", drag-and-drop. Hapus proyek mengunci baris proyek dulu (unggahan bersamaan gagal dan filenya dibuang). Hapus file dilewati jika masih dipakai foto karya (jaga-jaga).

**Integrasi dan uji manual (langkah 12)**

- **Open Graph JPEG:** cover disimpan WebP, yang tidak selalu tampil di pratinjau tautan WhatsApp. `opengraph-image.ts` di `/`, `/karya`, `/karya/[slug]`, `/tentang` membuat JPEG 1200×630 dari cover (`src/features/gallery/og-image.ts`). Per segmen, karena `openGraph` halaman anak menimpa gambar dari segmen induk.
- **`expireTime: 3600`:** default Next (1 tahun) mengirim `stale-while-revalidate=31532400`, sehingga browser pengunjung sempat menyajikan halaman Galeri versi lama sekali (terbukti saat uji: perubahan profil baru tampil pada kunjungan kedua). Server sendiri sudah segar segera setelah `revalidatePath`.
- **`UPLOAD_DIR` relatif mengikuti cwd proses.** Preview lokal menjalankan `next start <folder>` dengan cwd folder home, jadi `.env` lokal memakai path absolut. Di server, `UPLOAD_DIR` absolut (`/srv/galeri/uploads`).
- Uji manual (29 Okt 2026, build produksi lokal): salah 5× terkunci (password benar pun ditolak); setup 2FA + 10 kode pemulihan, login dengan kode pemulihan, logout mencabut sesi; `/studio/*` tanpa login → `/masuk?next=…` (Route Handler unggah tanpa sesi → 307); JPEG ber-GPS diunggah → file WebP tanpa EXIF; HEIC ditolak dengan pesan; terbitkan → muncul di Beranda, Katalog, Detail, sitemap; Draft dan harga tersembunyi data contoh tidak ada di HTML Galeri mana pun; tombol "Tanya karya ini" membuka `wa.me/62…` dengan judul + URL; Jadikan Karya menyalin foto progres; semua halaman Galeri dan Studio yang diuji tanpa overflow horizontal di 375 px, katalog 2 kolom.

**Review keamanan (subagent baru, 29 Okt 2026) dan tindak lanjutnya**

- **[Sedang] Race pada lockout** (cek kunci dan pencatatan gagal tidak atomik → ribuan tebakan 2FA paralel bisa lolos): setiap percobaan kini *dipesan* sebagai gagal sebelum verifikasi, lalu kunci dihitung dari percobaan lain (`beginLoginAttempt`/`finishLoginAttempt`). Paling banyak 5 request paralel sampai ke verifikasi (test integrasi 20 tebakan paralel). Password benar tanpa 2FA dihitung netral (barisnya dihapus).
- **[Rendah] og:image Beranda/Katalog/Tentang tidak ikut revalidate saat karya berubah:** `revalidateGallery()` kini selalu `revalidatePath("/", "layout")` (+ sitemap untuk perubahan karya).
- **[Rendah] Kunci per IP dengan IPv6 penuh:** IPv6 dikelompokkan per /64 (`ipGroup`); `MemoryMax=1G` di service.
- **[Rendah] Pemilik bisa dikunci oleh siapa pun yang tahu email admin:** sesuai desain PRD (kunci per email); DEPLOY.md menyarankan email admin berbeda dari email kontak publik.
- **[Rendah] Route Handler unggah tanpa cek Origin:** `receiveImageUpload` menolak request lintas situs (`Sec-Fetch-Site`/`Origin`), 403.
- **[Rendah] Backup memuat secret 2FA tanpa enkripsi:** `galeri-backup.sh` mendukung enkripsi `age` (`AGE_RECIPIENT`) dan grup baca untuk salinan off-site (`BACKUP_GROUP`).
- **Dugaan yang ditindaklanjuti:** varian `/_next/image` foto yang dihapus tersimpan sampai 1 tahun → `minimumCacheTTL` 1 hari (cara hapus segera di DEPLOY.md); proxy membuffer body sampai 16 MB untuk setiap request `/studio` → route unggah dikeluarkan dari matcher proxy dan batas buffer kembali 2 MB. Dugaan "slug acak di-cache ISR sebagai 404" tidak terbukti (40 slug acak tidak menambah file cache).
- **Info:** test statis kini juga menginventaris semua `"use server"`, Route Handler publik, dan bentuk ekspor handler. Ganti password dan `admin:reset-password` juga membatalkan tahap login yang sedang menunggu 2FA. Tidak dikerjakan (dicatat): CSP ber-nonce untuk Studio, batas umur absolut sesi, prefiks cookie `__Host-` (memutus login lewat http://localhost).
- `npm audit`: 6 temuan hanya di CLI pengembangan (`prisma` lewat `@prisma/config`/`deepmerge-ts`, `shadcn` lewat `deepmerge`), bukan jalur yang memproses input pengunjung; perbaikannya butuh Prisma 7 (versi mayor), ditunda.
