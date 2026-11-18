# Fase 5: Saran + AI analisis

Status: selesai 8 November 2026. Hasil ada di bagian akhir. Deploy ke VPS masih menunggu domain dan VPS dari pengguna, dan tidak menghalangi fase ini.

Tujuan: data dari Fase 4 berubah menjadi tindakan. Aplikasi menyarankan apa yang perlu dilakukan, menguji hipotesis A/B, memandu review mingguan, dan memberi penjelasan AI berdasarkan angka yang dihitung kode. Studio juga bisa dipasang di HP dan mencatat ide saat offline, dan semua data bisa diekspor.

## Scope

**Masuk Fase 5** (PRD menu 1, 8, 9, 10, bagian "Asisten AI", dan "Metrik, rumus, dan aturan saran"):

- **Mesin aturan** `src/lib/analytics/rules.ts` (10 aturan PRD) dan 3 kartu saran teratas di Beranda.
- **Eksperimen** `/studio/eksperimen`: hipotesis, varian A/B, perbandingan setelah H+7, kesimpulan.
- **Review Mingguan** `/studio/review`: ringkasan otomatis, refleksi, snapshot followers, fokus dan rencana minggu depan, riwayat.
- **AI analisis:**
  - **Draf ringkasan** di Review Mingguan;
  - **Kenapa?** di detail post.
- **PWA Studio:** bisa dipasang di layar utama HP, dan ide bisa dicatat saat offline lalu tersinkron otomatis.
- **Ekspor:** CSV dan JSON dari Pengaturan.

**Tidak masuk:**
- impor API TikTok/Instagram;
- chat "Tanya data" dan kalimat penjelas AI untuk setiap saran;
- blok waktu hari produksi di Kalender;
- impor/pulihkan data dari JSON;
- notifikasi push;
- semua fitur Toko (Fase 6).

## Keputusan

Tafsiran atas hal yang belum tegas di PRD. Perbarui PRD di akhir fase. Jika saat mengerjakan ada keputusan lain yang mengubah PRD, tanyakan dulu ke pengguna.

| No | Topik | Keputusan |
| --- | --- | --- |
| E1 | Mesin aturan | Fungsi murni, dihitung saat halaman dibuka (tanpa background job). Aturan berbasis data (4-8) memakai skor relatif (D4 Fase 4), hanya grup dengan ≥ 3 post, dan dihitung terpisah per platform. Satu saran per aturan per platform. "Unggul" berarti median skor relatif ≥ 1,2 (≥ 20% di atas biasanya); di bawah itu tidak ada saran "terbaik". |
| E2 | Ritme terancam (1) | Aktif mulai Kamis WIB jika konten tayang + terjadwal minggu ini < target (dihitung per konten, sama dengan Beranda). Saran menyebut maks. 2 konten Siap Posting yang belum terjadwal. |
| E3 | Lanjutkan seri (7) | Proyek belum Selesai; part tayang terakhir punya skor relatif ≥ 1 di salah satu platform; part berikutnya belum tayang atau terjadwal. |
| E4 | Crosspost tertinggal (8) | Konten dengan skor relatif ≥ 1,2 di satu platform, tayang ≤ 30 hari lalu, dan belum punya versi tayang atau terjadwal di platform lain. |
| E5 | Pilar terabaikan (9) | Pilar aktif dengan porsi target > 0 tanpa post tayang selama 14 hari. Hanya aktif jika total post tayang ≥ 3, supaya akun baru tidak diserbu saran. |
| E6 | Tampilan saran | Beranda menampilkan 3 teratas (urutan prioritas PRD), plus "Lihat semua". Setiap saran punya tautan tindakan dan tombol **Sembunyikan 7 hari** (tabel baru `SuggestionDismissal`, kunci = aturan + platform + subjek). |
| E7 | Eksperimen | Satu platform per eksperimen, dan post harus tayang di platform itu. Variabel dipilih dari daftar (hook, format, jam, durasi, cover, lainnya) + deskripsi varian A dan B. Hipotesis selalu dibaca "B lebih baik dari A". Metrik penentu dari daftar (skor, ER, save rate, share rate, follow rate, views). Satu post hanya masuk satu varian per eksperimen. Perbandingan (median per varian + selisih %) tampil setelah semua post punya H+7; sebelumnya tampil "menunggu H+7 untuk N post". Usulan otomatis: ≥ 2 post per varian dan B unggul ≥ 10% → Terbukti; A unggul ≥ 10% → Tidak terbukti; selain itu Belum jelas. Keputusan akhir tetap di tangan Andi, dan halaman menyebut bahwa ini bukan uji statistik. |
| E8 | Review Mingguan | Minggu = Senin-Minggu WIB. Pengingat di Beranda mulai Minggu 18.00 WIB sampai review minggu itu tersimpan; Senin-Selasa tampil "Review minggu lalu belum diisi". Halaman default ke minggu yang perlu di-review. Ringkasan otomatis: post vs target, followers bertambah per platform, post terbaik dan terburuk per platform (skor relatif), dan saran aktif. Ringkasan dibekukan di `summaryJson` saat disimpan. "Pilih 2-3 konten" memakai aksi penjadwalan Kalender yang sudah ada ke slot kosong minggu depan; id konten terpilih disimpan di review. |
| E9 | AI analisis | Dua fitur baru di inti `features/ai` dengan pola panel yang sama: `review-draft` (mengisi Apa yang berhasil / diulang / dihentikan / fokus minggu depan sebagai draf) dan `post-why` (hanya untuk post yang punya skor relatif). Semua angka dihitung `lib/analytics`; grup < 3 post dikirim berlabel "data belum cukup", dan AI wajib menyebutnya. Prompt berversi, jawaban mode uji, 10 kasus set uji per fitur. Perkiraan biaya Opus 5.5: draf review US$0,08-0,15, Kenapa? US$0,04-0,08. |
| E10 | PWA | Hanya Studio; Galeri tidak memasang service worker. Serwist (`@serwist/turbopack`) jika cocok dengan build Turbopack Next 16.4; jika tidak, service worker ditulis sendiri (catat dan perbarui PRD). Scope `/studio/`. Skrip service worker tidak boleh butuh login dan tidak berisi data. Yang di-cache hanya aset statis dan halaman offline; HTML Studio tidak di-cache karena berisi data pribadi. Halaman offline punya form + Ide yang menyimpan ke IndexedDB, lalu antrean dikirim lewat `createQuickIdea` saat online lagi (event `online` dan saat Studio dibuka) dengan badge "N ide menunggu sinkron". Logout menghapus cache, tetapi antrean ide tetap. |
| E11 | Ekspor | Tab Pengaturan baru **Ekspor**. CSV per data (ide, konten, post + metrik H+1/H+7, snapshot followers, karya) memakai pemisah `;` dan BOM UTF-8 supaya langsung terbuka benar di Excel berlocale Indonesia; waktu dalam WIB. JSON lengkap: semua tabel data, tanpa AdminUser, Session, LoginChallenge, LoginAttempt; file foto tidak ikut, hanya `storageKey`. Route Handler GET dengan `requireAdmin()`, nama file bertanggal WIB. Backup database tetap lewat cron server (sudah ada di `docs/DEPLOY.md`); tab ini hanya menjelaskannya. Impor/pulihkan tidak dibuat. |

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md, dan docs/FASE-5.md sampai habis (lihat juga "Hasil dan keputusan implementasi" di docs/FASE-3.md dan docs/FASE-4.md untuk pola yang sudah ada). Kerjakan Fase 5 sesuai checklist di docs/FASE-5.md.
Langkah 1-4 kamu kerjakan sendiri. Lalu pakai subagent paralel untuk langkah 5-8 (satu agent per area, hanya menyentuh folder fitur dan route-nya sendiri). Terakhir langkah 9-11, lalu centang checklist di file ini.
Jangan memanggil API berbayar tanpa persetujuan saya; uji memakai mock.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. Schema dan migrasi `saran`** (cara `prisma migrate diff` di `CLAUDE.md`).
  - `Experiment`: tambah `platform`, deskripsi varian A dan B; daftar variabel dan metrik penentu divalidasi Zod.
  - `WeeklyReview`: kolom id konten rencana minggu depan.
  - Tabel baru `SuggestionDismissal` (kunci unik, `until`).
  - `AiRun.targetType`: tambah `REVIEW`.
- [x] **2. Fungsi murni `src/lib/analytics/`** (tanpa Prisma/React/Next; test termasuk data kosong dan `views = 0`).
  - `rules.ts`: 10 aturan PRD dengan tafsiran E1-E5, output terurut prioritas, kunci stabil per saran. Test positif dan negatif per aturan, batas 1,2 dan ≥ 3 post, dan pemisahan platform.
  - `experiments.ts`: median metrik per varian, selisih %, status menunggu H+7, usulan kesimpulan (E7).
  - `review.ts`: ringkasan minggu, minggu yang perlu di-review, dan pengingat (E8).
  - Pakai ulang `scoring.ts`, `grouping.ts`, `snapshots.ts`, dan `tasks.ts` dari Fase 4; `groupScores` dipanggil dengan skor relatif untuk aturan 4-6.
- [x] **3. Inti saran `src/features/suggestions/`.**
  - Query yang menyusun input mesin aturan dari database dalam satu kali baca, dipakai Beranda dan Review.
  - Aksi `dismissSuggestion` (diawali `await requireAdmin()`).
  - Komponen `SuggestionCard` + daftar.
- [x] **4. AI analisis di inti `src/features/ai/`.**
  - Fitur `review-draft` dan `post-why`: prompt berversi, skema output, pengambil data (allowlist; angka dari `lib/analytics`), jawaban mode uji, 10 kasus set uji per fitur, label, dan perkiraan biaya awal.
  - Test: skema, hash prompt, data rahasia tidak dikirim, grup < 3 berlabel "data belum cukup" di payload.

### Fitur (boleh paralel dengan subagent; hanya folder sendiri, inti di atas hanya dibaca)

- [x] **5. Beranda** (`src/features/home/`, `studio/(app)/page.tsx`): 3 kartu saran teratas + "Lihat semua" + Sembunyikan 7 hari (E6), dan pengingat Review Mingguan (E8). Teks "Saran otomatis hadir di Fase 5" dihapus.
- [x] **6. Eksperimen** (`src/features/experiments/`, `eksperimen/`).
  - Daftar (berjalan / selesai) dan form (hipotesis, platform, variabel, varian A/B, metrik penentu).
  - Pilih post tayang per varian.
  - Perbandingan + usulan + simpan kesimpulan dan catatan (E7).
  - Hapus dengan konfirmasi. Detail post menampilkan eksperimen yang memakainya.
- [x] **7. Review Mingguan** (`src/features/reviews/`, `review/`).
  - Pilih minggu; ringkasan otomatis; refleksi; snapshot followers (pakai `AccountSnapshotDialog`); fokus minggu depan; pilih 2-3 konten dan jadwalkan ke slot kosong minggu depan (E8).
  - Tombol **Draf ringkasan** (AI, mengisi form sebagai draf; tidak tersimpan sampai Simpan).
  - Riwayat review.
- [x] **8. Ekspor** (`src/features/export/`, tab Pengaturan, Route Handler): CSV dan JSON (E11), dengan test isi file (pemisah, BOM, tanpa tabel auth, waktu WIB).

### Penutup (sesi utama)

- [x] **9. PWA Studio** (E10). Cek dulu dokumentasi Serwist untuk Next 16 Turbopack.
  - Manifest dan ikon Studio, service worker ber-scope `/studio/`, halaman offline + antrean ide di IndexedDB + sinkron, badge antrean.
  - CSP: `worker-src` dan `manifest-src`.
  - Logout menghapus cache.
  - Test: logika antrean dan sinkron (fungsi murni), dan Galeri tidak mendaftarkan service worker.
- [x] **10. Integrasi.**
  - Tombol **Kenapa?** di detail post (`post-why`).
  - Eksperimen di detail post.
  - Placeholder "Hadir di Fase 5" dihapus dari Eksperimen, Review, dan Pengaturan.
  - `revalidatePath` untuk Beranda, Review, dan Eksperimen dari aksi metrik dan konten yang mengubah saran.
- [x] **11. Verifikasi dan dokumentasi.**
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos. Test statis `requireAdmin` mencakup aksi, halaman, dan route baru.
  - **Uji manual** dengan `scripts/demo-metrics.ts` dan mode uji AI (`AI_MOCK=1`), desktop + 375 px:
    - setiap jenis saran bisa dimunculkan; Sembunyikan 7 hari bekerja; tidak ada saran yang mencampur platform;
    - eksperimen dari buat sampai kesimpulan, termasuk status "menunggu H+7";
    - review: pengingat Minggu malam, ringkasan, Draf ringkasan (Pakai mengisi form tanpa menyimpan), jadwalkan konten minggu depan, riwayat;
    - Kenapa? di detail post; post tanpa skor relatif tidak menampilkan tombolnya;
    - ekspor CSV terbuka benar (pemisah `;`, huruf Indonesia, waktu WIB); JSON tanpa data auth;
    - PWA: pasang dari browser, matikan server, tambah ide di halaman offline, nyalakan server, lalu ide tersinkron sekali (tidak dobel);
    - tanpa login, halaman, aksi, dan route baru dialihkan atau ditolak.
  - **Performa:** Beranda dengan 1.000 post contoh tetap < 1 detik (mesin aturan ikut dihitung).
  - Uji AI dengan API asli hanya jika Andi setuju (perkiraan ≤ US$0,30: satu panggilan per fitur baru).
  - Review oleh subagent yang belum melihat kode: kebenaran aturan, pencampuran platform, zona waktu minggu, service worker (cache data pribadi, scope), ekspor (kebocoran data auth), AI tidak menulis data.
  - Hapus data contoh dari `galeri_dev`.
  - Perbarui PRD (E1-E11, kolom dan tabel baru di "Model data"), README, dan `CLAUDE.md`. Centang checklist ini dan tulis "Hasil dan keputusan implementasi".
  - Daftar file per modul + pesan commit dalam format PowerShell (`git add ...; if ($?) { git commit -m "..." }`) untuk di-commit pengguna.

## Definisi selesai

- Beranda menampilkan saran yang benar per platform, dengan tautan tindakan.
- Eksperimen dan Review Mingguan bisa dipakai dari awal sampai akhir di desktop dan HP.
- Draf AI analisis hanya mengisi form, memakai angka dari kode, dan menyebut "data belum cukup" saat datanya kurang.
- Studio bisa dipasang di HP, dan ide yang dicatat saat offline masuk Bank Ide sekali saat online.
- Ekspor menghasilkan file yang langsung bisa dibuka, tanpa data auth.
- Lint, typecheck, test, dan build lolos; checklist dicentang; temuan review ditindaklanjuti atau dicatat.

## Catatan

- Paket baru yang diperkirakan: Serwist (`@serwist/turbopack` dan pendampingnya). Tidak ada layanan pihak ketiga baru.
- Subagent fitur (langkah 5-8) tidak menjalankan `npm run build` (berbagi `.next`) dan memakai `TEST_DB_NAME` sendiri untuk test integrasi.
- `master` masih unggul beberapa commit dari `origin`; push dilakukan pengguna kapan saja dan tidak menghalangi fase ini.

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis di E1-E11. Yang menyangkut perilaku dan data sudah masuk PRD (menu 1, 6, 8, 9, 10, Flow 2, "Asisten AI", "Metrik, rumus, dan aturan saran", "Model data", "Arsitektur").

**Inti (langkah 1-4, sesi utama)**

- **Skema:** migrasi `20261108090000_saran` (Experiment: `platform`, `variantA`, `variantB`, `concludedAt`; WeeklyReview: `plannedContentIds`; tabel `SuggestionDismissal`; index `ExperimentPost.postId`) dan `20261108120000_ide_offline` (`Idea.offlineId` unik, lihat PWA). `AiRun.targetType` tetap String; `REVIEW` ditambahkan di `AI_TARGET_TYPES`. Partial unique index snapshot dari Fase 4 tidak tersentuh (`prisma migrate diff` kosong setelah deploy).
- **Mesin aturan (`rules.ts`):** keluaran berupa angka jadi per aturan (tanpa teks); teks dan tautan tindakan dibuat `features/suggestions/copy.ts` (`SuggestionView`, serializable). Kunci `aturan:platform:subjek`, platform `-` untuk aturan yang tidak per platform. Subjek: ritme = Senin minggu itu; metrik tertunda = tetap per platform, muncul lagi hanya jika ada post yang jatuh tempo setelah disembunyikan (lihat Review); macet = konten + stage; terbaik = kunci grup; seri = proyek + nomor part (disembunyikan di satu platform = proyek itu tidak tampil di platform lain); crosspost = konten; pilar terabaikan = pilar; ide = tetap.
  - Metrik tertunda dibuat per platform (satu saran per aturan per platform), walaupun kartu Beranda lama menampilkan keduanya.
  - Pemenang "terbaik" yang disembunyikan tidak digantikan juara dua (itu bukan lagi yang terbaik). Aturan bersubjek banyak (macet, seri, crosspost, pilar terabaikan) menampilkan subjek berikutnya yang tidak disembunyikan.
  - "Jam terbaik" = kombinasi hari + jam WIB: `groupScores` mendapat dimensi `dayHour` (dan `duration` untuk "Kenapa?"). Tanpa jendela waktu: semua post berskor relatif ikut (skor relatif sudah relatif terhadap 10 post sebelumnya).
  - Ritme: konten Siap Posting yang sudah terhitung minggu ini atau terjadwal di masa depan tidak disebut ulang; Siap Posting terlama didahulukan.
  - Lanjutkan seri: part terakhir dihitung per platform; satu proyek hanya muncul sekali (platform dengan skor relatif tertinggi); jika part berikutnya belum dibuat, tautan ke proyek.
  - Pilar terabaikan: "total post tayang ≥ 3" dihitung per konten; pilar yang dibuat < 14 hari lalu dilewati; porsi target terbesar didahulukan.
  - Sembunyikan 7 hari diulang = diperpanjang dari sekarang; baris yang sudah lewat dirapikan saat menyembunyikan saran lain.
- **Eksperimen (`experiments.ts`):** perbandingan hanya dari H+7 (post dengan H+1 saja = menunggu). Selisih % terhadap median A; median A 0 dan B > 0 = "—" tetapi B dianggap unggul. Batas 10% memakai toleransi floating point kecil (110 vs 100 tepat 10%).
- **Review (`review.ts`):** halaman default = minggu berjalan mulai Minggu 18.00 WIB, selain itu minggu lalu. Followers bertambah = snapshot terakhir sebelum minggu berakhir dikurangi snapshot terakhir sebelum minggu dimulai (atau snapshot pertama di minggu itu), supaya satu snapshot per minggu (diisi saat review) sudah cukup; snapshot yang diisi Senin masuk minggu berikutnya.
- **AI analisis:** pengambil data di `features/ai/analysis-context.ts` (angka dari `getScoredPosts`, `groupScores`, `weeklySummary`, mesin aturan). Grup < 3 post dikirim tanpa median, berlabel "data belum cukup". "Kenapa?" membandingkan dengan grup post lain (tanpa post itu) di platform yang sama: pilar, format, tipe hook, hari, jam, durasi (`Post.durationSec`, cadangan target durasi konten; `getScoredPosts` kini membawa `durationSec`). Draf ringkasan memakai median skor relatif per pilar/format/hook/jam dari semua post sampai akhir minggu itu, post minggu itu dengan tagnya, saran aktif, dan isi form saat ini. Aturan angka bersama (`ANALYSIS_RULES`) ditempel di teks tugas; instruksi dasar `base@1` tidak diubah supaya cache dan hash fitur lama tetap. Versi `review-draft@1` dan `post-why@1`. Set uji: 10 kasus per fitur (`evals/analysis-cases.ts`) + pemeriksaan "angka yang tidak ada di data" dan "data belum cukup tidak disebut". Jawaban mode uji tersedia untuk keduanya.
- **"Kenapa?"** tidak punya form: panel menampilkan penjelasan; tombol "Salin semua" menyalin teks dan menandai run sebagai dipakai (dasar persentase draf dipakai).

**Fitur (langkah 5-8, subagent paralel per area)**

- **Beranda (5):** urutan di HP: pengingat review, pengingat followers, progres, tugas hari ini, Saran (lebar penuh di desktop), lalu kartu lama. Empty state menjelaskan kapan saran muncul. Saran Metrik tertunda/Macet/Ide menipis bisa tampil berdampingan dengan kartu lama yang sama (kartu lama tetap sesuai checklist).
- **Eksperimen (6):** eksperimen yang sudah disimpulkan mengunci tambah/pindah/lepas post sampai "Buka lagi" (teks tetap bisa diubah). Kesimpulan boleh disimpan kapan saja (mis. eksperimen dihentikan). Form kesimpulan mengikuti usulan selama hasil belum dipilih sendiri. Post yang kemudian tidak tayang lagi tetap terlihat berlabel, tetapi tidak ikut perbandingan. Deskripsi varian A dan B wajib berbeda; metrik bawaan Skor. Pemilih post maks. 50 hasil, pencarian tanpa membedakan huruf besar dan aksen.
- **Review Mingguan (7):** simpan ulang membekukan ulang angka terbaru; jika angka terkini sudah berbeda dari yang beku, kartu ringkasan menawarkan simpan ulang. Ringkasan beku `version: 1` berisi saran aktif sebagai teks, `frozenAt`, dan `weekStart`. `?minggu=` selain Senin diarahkan ke Senin minggunya. Kandidat rencana: belum tayang dan tanpa jadwal di masa depan; slot hanya slot kosong yang belum lewat di minggu rencana (minggu rencana yang sudah lewat hanya bisa dibaca). "Pakai semua" mengisi tiga refleksi dan fokus (satu poin per baris); narasi hanya di panel.
- **Ekspor (8):** `post.csv` punya kolom views per platform ("H+1 Views TikTok", "H+1 Reach Instagram"), hanya kolom platform post itu yang terisi; snapshot CUSTOM hanya di JSON. `followers.csv` punya kolom perubahan dari snapshot sebelumnya (per platform). Checklist ditulis dua kolom angka (bukan "3/5" yang dibaca Excel sebagai tanggal). Sel teks berawalan `=`, `+`, `-`, `@`, tab diberi `'`; angka negatif tidak. JSON: `format`, `version`, `exportedAt` (UTC) + `exportedAtWib`, `counts`, semua tabel dibaca dalam satu transaksi RepeatableRead; test membandingkan daftar tabel dengan DMMF Prisma.

**Penutup (langkah 9-11, sesi utama)**

- **PWA tanpa Serwist (E10, opsi cadangan):** `@serwist/turbopack` memang mendukung Turbopack, tetapi butuh esbuild native (atau esbuild-wasm) dan membungkus `next.config`, menyajikan worker dari Route Handler `/serwist/…`, dan `defaultCache`-nya meng-cache halaman serta respons RSC. Untuk E10 (hanya halaman offline, tanpa HTML Studio, scope Studio, tanpa login) hampir semua fiturnya harus dimatikan, jadi service worker ditulis sendiri (`public/studio-sw.js`, ±90 baris, tanpa paket baru). PRD baris PWA diperbarui.
  - Scope `/studio` (bukan `/studio/` seperti E10): scope berakhiran garis miring tidak mencakup Beranda `/studio`, padahal itu `start_url` PWA. File worker statis di `/studio-sw.js` (luar matcher proxy, tanpa login, tanpa data).
  - Navigasi Studio selalu ke jaringan (navigation preload); gagal → halaman offline dari cache. Cache hanya `studio-offline.html`, manifest, dan ikon; diisi ulang setelah navigasi berhasil jika kosong (mis. setelah logout) atau lebih tua dari 6 jam. `VERSION` dinaikkan jika worker atau halaman offline berubah.
  - Halaman offline mandiri (HTML + skrip inline, tanpa skrip Next) supaya tetap jalan setelah deploy baru; konstanta IndexedDB-nya dicek test terhadap `OFFLINE_IDEA_DB`.
  - **Sekali, tidak dobel:** setiap ide antrean membawa id acak yang dikirim sebagai `offlineId` (kolom unik baru di `Idea`); `createQuickIdea` mengembalikan ide yang sudah ada untuk id yang sama (juga saat 5 kiriman paralel). Satu tab saja yang mengirim (Web Locks), dan ide dihapus dari antrean hanya setelah server menjawab berhasil; gagal jaringan menghentikan pengiriman, ditolak server dibuang dengan toast. Dialog + Ide memakai id yang sama: jika koneksi putus saat simpan, ide masuk antrean perangkat (PRD Flow 2) tanpa risiko dobel. Ide antrean dengan pilar yang sudah nonaktif disimpan tanpa pilar, bukan dibuang.
  - Badge "N ide menunggu sinkron" melayang di atas halaman Studio (ketuk = kirim sekarang). Sinkron saat Studio dibuka dan event `online`.
  - Logout menghapus cache Studio sebelum aksi logout, dan halaman masuk menghapusnya lagi (sesi habis, keluar dari perangkat lain); antrean IndexedDB tidak disentuh.
  - CSP: Studio `worker-src 'self'`, Galeri `worker-src 'none'`, keduanya `manifest-src 'self'`. Manifest dan ikon Studio hanya ditautkan layout Studio. Ikon dibuat ulang dengan `npx tsx scripts/pwa-icons.ts`.
- **Integrasi (10):** "Kenapa?" dan kartu eksperimen di detail post. Revalidate Review/Eksperimen ditambahkan ke `revalidateMetrics`, `revalidateContent`, proyek, ide, jadwal Kalender, dan Pengaturan (target mingguan, bobot skor). Label rentang minggu disatukan di `formatWibWeekRange` (`lib/date.ts`).
- **Data contoh:** `scripts/demo-metrics.ts` kini juga membuat proyek seri (Part 2 kuat hanya di TikTok + Part 3 Siap Posting) dan konten macet 9 hari, supaya Lanjutkan seri, Crosspost, dan Pipeline macet bisa dimunculkan.

**Verifikasi (langkah 11, 8 Nov 2026)**

- `npm run lint`, `npm run typecheck`, `npm run test` (119 file, 1.340 test, termasuk integrasi ke `galeri_test`), `npm run build` lolos. Test statis `requireAdmin` mencakup aksi, halaman, dan route baru (Eksperimen, Review, Ekspor, saran).
- **Uji manual** di build produksi lokal dengan mode uji AI (konfigurasi preview `content-planner-ai-mock`), 1.246 px dan 375 px (emulasi di pane), dengan data contoh:
  - Saran: kesepuluh jenis muncul (Ritme dan Pilar terabaikan dipicu sementara dengan target 9 dan tanggal buat pilar dimundurkan, lalu dikembalikan). Saran per platform hanya menyebut platformnya sendiri. "Lihat semua (11)" membuka sisanya; Sembunyikan 7 hari pada Pipeline macet langsung menampilkan konten macet berikutnya.
  - Eksperimen: buat (TikTok, Hook, metrik Skor) → tambah post A/B → "Menunggu H+7 untuk 3 post" → pindah varian dan lepas post → isi H+7 dari detail post (`10K`) → median 115,5 vs 98,3, selisih −14,9%, usulan Tidak terbukti + kalimat "bukan uji statistik" → simpan kesimpulan (post terkunci) → daftar Selesai → Buka lagi → hapus dengan konfirmasi. Post `views = 0` tampil 0,0. Detail post menampilkan kartu eksperimen.
  - Review: default minggu lalu sebelum Minggu 18.00 WIB; Berikutnya mati di minggu berjalan. Draf ringkasan (mode uji) → Pakai semua mengisi 4 field, toast "Belum tersimpan", tidak ada baris WeeklyReview sampai Simpan; AiRun `REVIEW` ditandai dipakai. Rencana: 2 konten, satu dijadwalkan ke Kamis 12 Nov 19.00 (TikTok + Instagram) lewat dialog slot; isi form tetap setelah jadwal tersimpan. Simpan → ringkasan beku + riwayat. Pengingat Beranda tidak tampil sebelum Minggu 18.00 WIB atau saat review minggu itu sudah tersimpan; Minggu 21.10 WIB tanpa review tampil "Saatnya review mingguan" dengan tautan ke minggu berjalan, dan halaman Review default ke minggu berjalan.
  - Kenapa?: panel di post berskor relatif (2,95x) menyebut skor relatif dan grup sebanding; post tanpa skor relatif tidak punya tombolnya.
  - Ekspor: enam file 200 dengan nama bertanggal WIB, `no-store`; CSV ber-BOM, pemisah `;`, CRLF, waktu WIB, desimal koma; JSON 23 tabel tanpa tabel atau string auth.
  - PWA: Galeri ditolak CSP saat mencoba mendaftarkan worker dan tidak punya manifest. Studio: worker aktif dengan scope `/studio`, precache 5 file, navigation preload aktif. Server dimatikan → `/studio/kalender` menampilkan halaman offline → 2 ide dicatat → server dinyalakan → Bank Ide berisi tepat 2 ide (masing-masing satu baris, `offlineId` terisi, medium terbawa) walau event `online` dipicu 3 kali. Logout → cache Studio kosong, antrean IndexedDB tetap; masuk lagi → ide antrean terkirim dan cache terisi ulang.
  - Tanpa sesi: `/studio/eksperimen`, `/studio/eksperimen/[id]`, `/studio/review?minggu=…`, `/studio/ekspor/*` dialihkan ke `/masuk?next=…`; `/studio-sw.js`, `/studio-offline.html`, `/studio.webmanifest` tetap 200 tanpa login.
  - 375 px: tanpa overflow horizontal di Beranda (semua saran dibuka), detail Eksperimen + dialog pilih post, Review, Pengaturan → Ekspor. Ditemukan dan diperbaiki: kolom grid form Review melebar mengikuti judul panjang di daftar rencana (`grid-cols-1`).
- **Performa** dengan 1.007 post contoh, median 6 request lokal (mesin sedang lebih lambat dari pengukuran Fase 4: Analitik 281 ms vs 139 ms, Postingan 277 ms vs 132 ms di Fase 4): Beranda 549-621 ms (target < 1 detik, mesin aturan ikut dihitung), Review 439-463 ms, detail post 266 ms, Eksperimen 224 ms, ekspor JSON 285 ms, `post.csv` 432 ms.
- **Ditemukan saat uji browser dan diperbaiki:** suntingan service worker sempat membuang listener `install`/`activate` (cache kosong, worker tidak mengambil alih tab sampai navigasi berikutnya). Dipulihkan + test statis.

**Review (subagent baru, 8 Nov 2026) dan tindak lanjutnya**

Tidak ada temuan Tinggi atau Sedang. Diperiksa dan tampak benar: 10 aturan dan kasus tepinya, pemisahan platform di saran/review/eksperimen/AI/ekspor, minggu dan pengingat WIB (unit test juga lolos di zona runtime New York, Santiago, London, Kiritimati), service worker tanpa cache HTML, sinkron ide offline tanpa duplikat, ekspor tanpa data auth, AI tidak menulis data, dan `requireAdmin` + Zod di semua pintu baru.

- **[Rendah] Cache offline terisi lagi dari navigasi yang dialihkan ke `/masuk` setelah logout** → diisi ulang hanya dari respons Studio yang `ok` dan bukan redirect (`VERSION` → `studio-v2`) + test statis.
- **[Rendah] Menyembunyikan "Lanjutkan seri" memunculkan proyek yang sama di platform lain** → proyek yang disembunyikan di platform mana pun dilewati + test.
- **[Rendah] Kunci "Metrik tertunda" tidak stabil** (berganti saat post terbaru diisi) → subjek tetap per platform (`pending-metrics:TIKTOK:tertunda`); setelah disembunyikan, saran muncul lagi hanya jika ada post yang jatuh tempo setelah waktu disembunyikan (`SuggestionDismissal.updatedAt`) + test.
- **[Rendah] Ketikan di halaman offline hilang saat koneksi kembali** → pindah ke Studio hanya jika kolom judul kosong; jika tidak, tampil petunjuk untuk menyimpan dulu.
- **[Rendah, dicatat] `/masuk` di luar scope PWA:** saat sesi habis di aplikasi terpasang, halaman masuk tampil sebagai halaman di luar aplikasi. Perlu dicoba di HP asli (Android dan iPhone), lihat di bawah.
- **[Info, dicatat]** Saran aktif di ringkasan minggu lalu adalah saran saat review disimpan (bukan saran pada minggu itu), dan target yang dipakai adalah target saat ini. Badge antrean di tab lain baru berubah saat tab itu sinkron. Migrasi `saran` menambah kolom wajib Experiment tanpa default; aman karena tabel itu belum pernah punya UI (kosong di `galeri_dev`).

**Belum dilakukan atau dicatat**

- Belum diuji di HP asli: memasang PWA dari browser (kriteria dipenuhi: manifest dengan ikon 192/512 + maskable, worker dengan handler fetch, HTTPS/localhost; pane tidak punya menu pasang), halaman masuk di luar scope PWA, dan antrean offline di iOS.
- Uji AI dengan API asli belum dilakukan (menunggu persetujuan; perkiraan ≤ US$0,30 untuk satu Draf ringkasan + satu Kenapa? dengan Opus 5.5). Set uji `npm run ai:eval -- review-draft` / `post-why` siap (10 kasus per fitur).
- Saran dihitung dari semua post tayang di setiap request. Jika data jauh di atas 1.000 post, `getScoredPosts` + mesin aturan adalah titik pertama yang perlu di-cache.
- Data contoh (`[Demo]`), data uji (`[Uji Fase 5]`: ide, review, sesi, saran tersembunyi, AiRun mode uji) dihapus dari `galeri_dev`; target mingguan, tanggal pilar, dan status AI dikembalikan ke nilai semula.
