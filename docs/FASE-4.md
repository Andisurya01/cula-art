# Fase 4: Data

Status: selesai 6 November 2026. Hasil ada di bagian akhir. Deploy ke VPS masih menunggu domain dan VPS dari pengguna, dan tidak menghalangi fase ini.

Tujuan: performa setiap post tercatat dalam kurang dari 1 menit, lalu aplikasi menunjukkan apa yang berhasil per platform. Fase 5 (mesin aturan dan AI analisis) memakai data dari fase ini.

## Scope

**Masuk Fase 4** (PRD menu 1, 6, 7):

- **Postingan** `/studio/postingan` + detail `/studio/postingan/[id]`: daftar post, badge status metrik, form metrik, metrik terhitung.
- **Snapshot followers** per platform.
- **`lib/analytics`**: status metrik, skor per post, `grouping.ts`, KPI, streak.
- **Analitik** `/studio/analitik` dengan Recharts.
- **Beranda Studio penuh:** streak, tugas hari ini, metrik tertunda + isi cepat, grafik mini followers.
- **Target 3 bulan** (followers dan ER per platform) di Pengaturan.
- **Persiapan impor API:** hanya kolom data, tanpa panggilan API.

**Tidak masuk:** impor API TikTok/Instagram, mesin aturan dan kartu saran, Eksperimen, Review Mingguan, AI analisis (semuanya Fase 5 atau "Nanti"), dan blok waktu hari produksi di Kalender.

## Keputusan

Tafsiran atas hal yang belum tegas di PRD. Perbarui PRD di akhir fase. Jika saat mengerjakan ada keputusan lain yang mengubah PRD, tanyakan dulu ke pengguna.

| No | Topik | Keputusan |
| --- | --- | --- |
| D1 | Filter platform di Analitik | Tab TikTok dan Instagram, **tanpa pilihan "Semua"**. KPI dan grafik selalu untuk satu platform (aturan `CLAUDE.md`: metrik tidak pernah dicampur). Hanya daftar Postingan yang boleh menampilkan semua platform. |
| D2 | Field `views` | Sesuai PRD: TikTok = views, Instagram = reach. Label di form mengikuti platform ("Views" atau "Reach"). |
| D3 | Status metrik | Dihitung dari `postedAt`, tanpa tabel jadwal. < 24 jam: "Menunggu H+1". 24 jam sampai 7 hari tanpa H+1: **Perlu H+1**. Sudah ada H+1 dan belum 7 hari: "Menunggu H+7". ≥ 7 hari tanpa H+7: **Perlu H+7** (H+1 tidak ditagih lagi). Ada H+7: **Lengkap**. |
| D4 | Skor relatif | Median skor sampai 10 post sebelumnya di platform yang sama (berdasarkan `postedAt`, tidak terikat rentang filter). Pembanding kurang dari 3 post: tampil "—" dan post tidak masuk top/bottom. |
| D5 | Snapshot yang dipakai | H+7, cadangan H+1 (PRD). Angka dari H+1 diberi penanda di detail dan tabel. `recordedAt` otomatis saat disimpan, jadi tidak ada input tanggal di form. Snapshot `CUSTOM` belum punya UI. |
| D6 | Medium konten | `Content` tidak punya kolom medium. Filter memakai `project.medium`, lalu `idea.medium`. Konten tanpa keduanya hanya muncul saat filter "Semua medium". |
| D7 | Tugas hari ini | PRD menyebut konten yang "dijadwalkan dikerjakan", tetapi jadwal pengerjaan tidak ada datanya. Isinya: post terjadwal hari ini; post lewat jadwal yang belum tayang (maks. 7 hari ke belakang); konten terjadwal ≤ 2 hari lagi yang belum Siap Posting. |
| D8 | Permintaan snapshot followers | Review Mingguan baru ada di Fase 5. Sampai saat itu, Beranda menampilkan pengingat jika suatu platform belum punya snapshot dalam 7 hari terakhir. Input juga tersedia di Postingan dan Analitik. |
| D9 | Streak | Minggu WIB berturut-turut dengan post tayang ≥ target, dihitung per konten, memakai target saat ini. Minggu berjalan menambah streak jika sudah memenuhi target, dan tidak memutusnya jika belum. |
| D10 | Followers bertambah | Snapshot terakhir dikurangi snapshot pertama dalam rentang, per platform. Kurang dari 2 snapshot: tampil "—". |
| D11 | Target 3 bulan | Opsional. KPI hanya menampilkan pembanding target jika sudah diisi (pertanyaan terbuka PRD, tidak menghalangi fase ini). |

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md, dan docs/FASE-4.md sampai habis. Kerjakan Fase 4 sesuai checklist di docs/FASE-4.md.
Langkah 1-5 kamu kerjakan sendiri. Lalu pakai subagent paralel untuk langkah 6-9 (satu agent per area, hanya menyentuh folder fitur dan route-nya sendiri). Terakhir langkah 10-11, centang checklist di file ini.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. Paket dan schema.**
  - Pasang `recharts` (3.x mendukung React 19). Tidak ada layanan pihak ketiga baru.
  - Migrasi `data` (cara `prisma migrate diff` di `CLAUDE.md`):
    - `Post.externalId` opsional, unik per `platform + externalId`;
    - enum `DataSource` (`MANUAL`, `API`), kolom `source` default `MANUAL` di `MetricSnapshot` dan `AccountSnapshot`.
  - Aturan `postId + kind` unik kecuali `CUSTOM`: sekarang database hanya PostgreSQL, jadi coba partial unique index lewat SQL mentah di migrasi. Pastikan `prisma migrate diff` tidak melaporkannya sebagai perbedaan. Jika dilaporkan, tegakkan di transaksi Server Action dan catat alasannya.
- [x] **2. Fungsi murni `src/lib/analytics/`** (tanpa Prisma/React/Next; test termasuk `views = 0` dan data kosong).
  - `snapshots.ts`: pilih snapshot terbaik (D5) dan status metrik (D3).
  - `scoring.ts`: skor dan skor relatif per post, per platform (D4), memakai bobot dari Setting.
  - `grouping.ts`: median skor per pilar, format, tipe hook, hari, dan jam (WIB), dengan penanda `enoughData` (≥ 3 post).
  - `kpi.ts`: total post, rata-rata ER, followers bertambah (D10), post per minggu.
  - `streak.ts`: streak (D9).
  - `tasks.ts`: tugas hari ini (D7) dan pengingat snapshot followers (D8).
- [x] **3. Inti `src/features/metrics/`.**
  - `schema.ts`, `actions.ts` (diawali `await requireAdmin()`), `queries.ts`:
    - simpan/ubah snapshot H+1 atau H+7 (post harus punya `postedAt`; satu per post + kind), hapus snapshot;
    - simpan snapshot followers (tanggal WIB, tidak boleh di masa depan, satu per platform + tanggal).
  - Validasi: bilangan bulat ≥ 0; completion rate 0-100; waktu tonton opsional. Likes > views hanya peringatan, bukan penolakan.
  - Input angka menerima format dari aplikasi TikTok/IG (`12.345`, `12,3K`, `1,2rb`, `1,2jt`) lewat fungsi murni `parseCount` + test.
  - `revalidatePath` untuk Postingan, Analitik, Beranda, dan detail konten. `routes.studio.post(id)` di `src/lib/routes.ts`.
- [x] **4. Komponen bersama.**
  - `MetricFormDialog`: form < 1 menit, nyaman di HP (`inputMode="numeric"`, 6 field inti, 2 opsional dilipat, label sesuai platform).
  - `AccountSnapshotDialog`: followers per platform sekaligus.
  - `src/components/charts/`: grafik garis dan batang Recharts. **Baca skill `dataviz` lebih dulu.** Hanya dipakai di Studio; Galeri tidak boleh ikut memuat Recharts.
  - Status badge metrik (Menunggu, Perlu H+1, Perlu H+7, Lengkap).
- [x] **5. Data contoh `scripts/demo-metrics.ts`.**
  - Membuat konten, post, snapshot, dan snapshot followers berlabel `[Demo]` di `galeri_dev`, jumlah bisa diatur (`--jumlah 1000`), dan `--hapus` hanya menghapus data berlabel itu.
  - Dipakai untuk uji browser dan uji performa. Hapus lagi setelah pengujian.

### Fitur (boleh paralel dengan subagent; hanya folder sendiri, inti di atas hanya dibaca)

- [x] **6. Postingan** (`src/features/metrics/components/`, `postingan/`).
  - Daftar post yang sudah tayang: judul, platform, pilar, tanggal WIB, badge status, angka utama. Filter platform (termasuk Semua), pilar, status, rentang tanggal di URL. Paginasi.
  - Tombol isi metrik langsung dari baris (`MetricFormDialog`), dan input snapshot followers di header.
  - Detail post: tautan ke post asli dan konten, snapshot H+1 dan H+7, ER, save rate, share rate, follow rate, skor, skor relatif, dan perbandingan terhadap median post sebelumnya. Bisa ubah dan hapus snapshot.
- [x] **7. Analitik** (`src/features/analytics/`, `analitik/`).
  - Filter di URL: platform (D1), 7/30/90 hari, medium (D6).
  - Kartu KPI + pembanding target jika diisi (D11).
  - Grafik garis followers.
  - Grafik batang median skor per pilar, format, tipe hook, hari, jam. Grup < 3 post ditampilkan redup dan berlabel "data belum cukup".
  - Tabel top 5 dan bottom 5 berdasarkan skor relatif.
  - **TikTok vs Instagram untuk konten yang sama:** skor relatif masing-masing berdampingan, angka mentah di kolom platformnya sendiri, tanpa total gabungan.
  - Empty state yang menjelaskan apa yang perlu diisi.
- [x] **8. Beranda Studio** (`src/features/home/`, `studio/(app)/page.tsx`).
  - Progres minggu ini (tayang dan terjadwal vs target) + streak.
  - Tugas hari ini (D7).
  - Metrik tertunda dengan tombol isi cepat yang langsung membuka form H+1 atau H+7.
  - Grafik mini followers 30 hari, satu grafik per platform.
  - Pengingat snapshot followers (D8).
  - Kartu yang sudah ada (jumlah per stage, macet, bank ide) tetap. Saran otomatis tetap dicatat sebagai Fase 5.
- [x] **9. Pengaturan: Target 3 bulan** (`src/features/settings/`, `pengaturan/`). Kartu di tab Jadwal: target followers dan ER per platform (`Setting.followerTargetJson`, skemanya sudah ada).

### Penutup (sesi utama)

- [x] **10. Integrasi.**
  - Detail konten → versi platform yang sudah tayang: badge status dan tautan ke detail post.
  - Konfirmasi hapus versi platform menyebut bahwa metriknya ikut terhapus.
  - Teks placeholder "Hadir di Fase 4" hilang dari Postingan, Analitik, dan Beranda.
- [x] **11. Verifikasi dan dokumentasi.**
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos. Test statis `requireAdmin` mencakup aksi baru.
  - **Uji manual dengan data contoh** (desktop + 375 px):
    - isi H+1 dari Beranda dan H+7 dari Postingan, dengan angka seperti `12,3K`; status dan angka di Beranda, Postingan, Analitik, dan detail konten ikut berubah;
    - post `views = 0` tampil 0, bukan NaN;
    - grup < 3 post berlabel "data belum cukup"; pembanding < 3 post tampil "—";
    - ganti tab platform: tidak ada angka TikTok di tab Instagram, dan sebaliknya;
    - waktu dan jam posting mengikuti WIB, termasuk post dekat tengah malam;
    - tanpa login, halaman dan aksi baru dialihkan atau ditolak.
  - **Performa:** Beranda, Postingan, dan Analitik < 1 detik dengan 1.000 post contoh (PRD); tambah index jika perlu.
  - Recharts tidak ada di bundle halaman Galeri.
  - Review oleh subagent yang belum melihat kode: pencampuran platform, zona waktu, kebenaran skor dan median, aturan unik snapshot, kebocoran data ke Galeri.
  - Hapus data contoh dari `galeri_dev`.
  - Perbarui PRD (D1-D11, kolom baru di "Model data"), README, dan `CLAUDE.md`. Centang checklist ini dan tulis "Hasil dan keputusan implementasi".
  - Daftar file per modul + pesan commit dalam format PowerShell (`git add ...; if ($?) { git commit -m "..." }`) untuk di-commit pengguna.

## Definisi selesai

- Metrik satu post bisa diisi dalam kurang dari 1 menit dari HP, lalu terlihat di semua menu terkait.
- Tidak ada agregat atau grafik yang mencampur TikTok dan Instagram.
- Semua fungsi `lib/analytics` baru murni dan punya test, termasuk `views = 0` dan data kosong.
- Lint, typecheck, test, dan build lolos; checklist dicentang; temuan review ditindaklanjuti atau dicatat.

## Catatan

- Fase ini tidak memanggil API berbayar. Asisten AI tidak berubah.
- Subagent fitur (langkah 6-9) tidak menjalankan `npm run build` (berbagi `.next`) dan memakai `TEST_DB_NAME` sendiri untuk test integrasi.
- Akun Instagram sebaiknya sudah Business/Creator sebelum impor API nanti. Itu tindakan pengguna dan tidak dibutuhkan di fase ini.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis di D1-D11. Yang menyangkut perilaku sudah masuk PRD.

**Inti (langkah 1-5, sesi utama)**

- **Skema:** partial unique index `MetricSnapshot_postId_kind_key` (`WHERE "kind" <> 'CUSTOM'`) ditulis manual di migrasi `20261105090000_data`. `prisma migrate diff` tidak melaporkannya sebagai perbedaan, jadi aturan ini ditegakkan database, bukan transaksi Server Action. Recharts 3.10.1.
- **Simpan snapshot:** `updateMany`, lalu `create`, dan P2002 ditangani sebagai `updateMany` lagi. Test 5 simpan paralel tetap menghasilkan satu baris. `recordedAt` diperbarui setiap simpan (waktu angka terakhir disimpan); riwayat ubah tidak disimpan.
- **Form metrik:** views wajib, field inti lain kosong berarti 0 supaya tidak perlu mengetik nol di HP. Pratinjau ER langsung di form. Keyboard angka HP tidak punya huruf, jadi ada tombol akhiran K dan jt (hanya layar kecil), juga di dialog followers. Enter pindah ke field berikutnya; hanya field terakhir yang terlihat yang menyimpan, karena field kosong berarti 0. Error di bagian opsional membuka bagian itu.
- **`parseCount`:** tanpa akhiran, `12.345` dan `12,345` berarti dua belas ribu, sedangkan `12,3` ditolak karena bukan bilangan bulat. `M` berarti juta (aplikasi berbahasa Inggris). Batas `2.000.000.000`. Angka mentah di schema harus sudah bilangan bulat, supaya `12.345` tidak terbaca sebagai `12345`.
- **Skor relatif:** pembanding hanya post yang sudah punya skor. Post `views = 0` punya skor 0 dan tetap jadi pembanding. Median pembanding 0 berarti "—", bukan Infinity. Post dengan `postedAt` sama diurutkan menurut id. Top/bottom: satu post hanya di satu daftar, jadi jika data sedikit, daftar bottom bisa lebih pendek.
- **Metrik tertunda:** Perlu H+1 tampil lebih dulu, karena hanya ditagih sampai hari ke-7 dan tidak boleh tertimbun tunggakan H+7 lama. Dalam jenis yang sama, yang paling lama lewat lebih dulu.
- **Streak (D9):** konten yang tayang di dua minggu berbeda dihitung di keduanya, sama dengan kartu "Post minggu ini".
- **Tugas (D7):** jadwal yang sudah lewat, termasuk tadi pagi, berjenis "Lewat jadwal"; "Hari ini" hanya untuk jadwal yang belum lewat. Satu baris per konten + jenis. Konten belum siap yang dijadwalkan hari ini tidak dibuat ganda, cukup disebut stage-nya.
- **Pengingat followers (D8):** snapshot 7 hari kalender WIB lalu sudah diingatkan; 6 hari lalu belum.
- **Tambahan kecil:** `deleteAccountSnapshot` + daftar "Riwayat snapshot" di Analitik, supaya snapshot yang salah tanggal bisa dihapus. Checklist hanya menyebut simpan.
- **`getSettings()`:** baca dulu dan buat hanya jika belum ada, plus `cache` per request. Upsert lama gagal P2002 saat dua panggilan paralel pada tabel kosong, dan `getScoredPosts` kini memanggilnya bersama query lain.
- **Grafik (skill dataviz):** TikTok biru, Instagram oranye, lolos validator semua pasangan di permukaan kartu terang (`#ffffff`) dan gelap (`#171717`). Satu seri per grafik, jadi tanpa legend. Batang 20 px, ujung data 4 px, nilai di ujung batang, grup < 3 post `fill-opacity` 0,35. Setiap grafik punya tabel kembaran. Label sumbu followers memakai angka penuh jika rentang sempit, supaya tick tidak kembar.
- **Data contoh:** snapshot followers tidak punya kolom teks, jadi labelnya id berawalan `demo_`. Snapshot asli pada tanggal yang sama tidak ditimpa.

**Fitur (langkah 6-9, subagent paralel per area)**

- **Postingan (6):** tabel mulai `lg:` karena di `md` sidebar hanya menyisakan sekitar 464 px; kartu dan tabel memakai satu DOM. Pilihan pilar diambil dari post yang ada, jadi pilar nonaktif tetap muncul. `sampai` < `dari`: `sampai` diabaikan. Halaman melebihi batas menjadi halaman terakhir. Tidak ada jumlah total, hanya "Halaman x dari y".
- **Analitik (7):** empty state halaman hanya mengganti KPI, median, dan top/bottom; followers dan perbandingan tetap tampil jika ada datanya. "Sekarang" pada target memakai snapshot terakhir, tidak terikat rentang. Riwayat snapshot hanya rentang aktif. Bagian TikTok vs Instagram terpisah dari tab.
- **Beranda (8):** angka besar progres = post tayang, selaras dengan streak; yang terjadwal tampil pudar di bilah. "Lihat semua (N)" hanya jika N > 8, menaut ke `?status=PERLU`. Jam tugas di hari lain menyertakan tanggal.
- **Pengaturan (9):** semua target kosong disimpan `{}`. Setelah simpan, form menampilkan angka tersimpan (`12,3K` menjadi `12300`).

**Integrasi (langkah 10)**

- Detail konten: versi yang sudah tayang menampilkan badge status dan tautan "Lihat metrik". Status dihitung di server (`getContentDetail`). Konfirmasi hapus versi sudah menyebut metrik; konfirmasi hapus konten kini juga menyebutnya.
- `revalidateContent` ikut me-revalidate Postingan dan Analitik. Aksi proyek dan ide me-revalidate Analitik, karena medium menentukan filter (D6).

**Verifikasi (langkah 11, 5-6 Nov 2026)**

- `npm run lint`, `npm run typecheck`, `npm run test` (92 file, 1.030 test, termasuk integrasi ke `galeri_test`), `npm run build` lolos. Test statis `requireAdmin` mencakup aksi dan halaman baru.
- **Uji manual** di build produksi lokal, lebar 375 px (emulasi di pane) dan 1280 px, gelap dan terang, dengan data contoh:
  - H+1 dari Beranda dan H+7 dari Postingan dengan `12,3K`, `45,6K`, `3,2rb`, `1,1K`: status dan angka ikut berubah di Beranda, Postingan, detail post, Analitik, dan detail konten. ER dan skor dicocokkan dengan hitungan tangan (1.287 / 12.300 = 10,5%; skor 118,4).
  - `views = 0` tampil 0, ER 0,0%, skor relatif 0,00x. Grup < 3 post redup dan berlabel "data belum cukup". Post tertua tampil "—".
  - Tab TikTok tanpa label Reach dan tanpa tautan post Instagram, dan sebaliknya, di luar bagian perbandingan. Target hanya tampil di platform yang diisi.
  - Jam dekat tengah malam tampil 23.50 dan 00.10 WIB, grup jam 00.00 dan 23.00. Tes zona waktu tambahan oleh reviewer: `startOfWibDay`, `startOfWibWeek`, `wibIsoDay` tanpa selisih di 6 zona runtime.
  - Tanpa sesi, `/studio/postingan`, `/studio/postingan/[id]`, dan `/studio/analitik` dialihkan ke `/masuk?next=…`. Sesi dicabut di database saat form terbuka → simpan dialihkan ke `/masuk`, tanpa baris baru.
  - Ubah dan hapus snapshot, snapshot followers (masa depan ditolak, pengingat D8 hilang setelah diisi), target 3 bulan, filter medium, dan dua perubahan filter cepat.
  - Tanpa overflow horizontal di 375 px pada Beranda, Postingan, detail post, Analitik, dan Pengaturan.
- **Performa** dengan 1.004 post contoh, median 6 request lokal: Beranda 212 ms, Postingan 132 ms, detail post 114 ms, Analitik 139 ms. Index tambahan tidak diperlukan.
- **Bundle:** chunk Recharts hanya dimuat `/studio` dan `/studio/analitik`, tidak di `/`, `/karya`, `/karya/[slug]`, `/tentang`, `/masuk`. Ditambah test statis `charts-boundary.static.test.ts`.
- **Review subagent baru:** tidak ada pencampuran platform, zona waktu salah, kebocoran ke Galeri, atau duplikat snapshot. Temuannya ditindaklanjuti: test yang belum mengikuti urutan H+1, Enter yang menyimpan form setengah isi, tick sumbu kembar, filter yang saling membuang, Analitik yang tidak di-revalidate saat medium berubah, error tersembunyi di bagian terlipat, akhiran di keypad angka, dan angka besar di grid 375 px.
- **Test flaky Fase 3 diperbaiki:** `run.int.test.ts` "batas bulanan" gagal 2 dari 12 run di kode yang tidak diubah fase ini, karena jawaban tiruan 50 ms bisa selesai lebih dulu dari antrean transaksi. Panggilan kini ditahan sampai semua diputuskan, dan hasilnya pasti (2 lolos, 3 ditolak; 20 dari 20 run lolos). Kode produksi tidak berubah.
- Data contoh, sesi uji, dan target uji sudah dihapus dari `galeri_dev`.

**Belum dilakukan atau dicatat**

- Belum diuji di HP asli, jadi waktu isi < 1 menit belum diukur dengan orang sungguhan, dan tombol "next" keyboard iOS belum dicoba. Uji 375 px memakai emulasi di pane.
- `revalidateContent` selalu me-revalidate Galeri, termasuk dari aksi checklist yang tidak tampil di Galeri (temuan review, perilaku lama dari luar fase ini). Tidak diubah.
- Skor relatif dihitung dari semua post tayang di setiap request, cukup cepat untuk 1.000 post. Jika nanti jauh lebih banyak, ini titik pertama yang perlu di-cache.
