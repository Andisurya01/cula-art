# Fase 3: Asisten AI (persiapan konten)

Status (29 Okt 2026): selesai. Langkah 1-13 dikerjakan; uji dengan API asli menunggu kunci API dan persetujuan pengguna (lihat "Verifikasi").

Tujuan: menyiapkan konten lebih cepat dengan draf AI (ide, hook, script, caption, teks karya) yang selalu diperiksa dulu oleh Andi. Biaya terkendali, setiap panggilan tercatat, dan aplikasi tetap bisa dipakai penuh tanpa AI.

## Scope

**Masuk Fase 3** (PRD bagian "Asisten AI (Studio)"):

- Tab **Panduan AI** di Pengaturan:
  - gaya bahasa, contoh terbaik (maks. 10), fakta kreator dan karya, hashtag per pilar dan platform, kata/topik yang dihindari;
  - pengaturan teknis: AI aktif/nonaktif, model (default `claude-opus-5-5`), batas US$10/bulan, batas 100 panggilan/hari;
  - pemakaian bulan ini.
- Enam tombol **Bantu AI**: Kembangkan ide, Ide dari proyek, Hook, Script & shot list, Caption & hashtag, Karya dari foto.
- Satu pola panel untuk semua tombol: opsi hasil, Pakai, Buat ulang, instruksi tambahan, perkiraan biaya, streaming.
- Output terstruktur dari skema Zod, prompt caching untuk awalan Panduan AI, prompt berversi, log `AiRun`, cek batas sebelum setiap panggilan, error sebagai toast, set uji.

**Tidak masuk:** AI analisis (draf Review Mingguan, "Kenapa?"; Fase 5), chat "Tanya data", gambar/video buatan AI, dan semua bentuk simpan atau posting otomatis.

## Keputusan

Keputusan yang sudah tertulis di PRD/CLAUDE.md: Claude API lewat `@anthropic-ai/sdk`, hanya dari server setelah `requireAdmin()`, model default Claude Opus 5.5, batas US$10/bulan dan 100 panggilan/hari, AI hanya mengisi draf.

### Perubahan PRD (disetujui 29 Okt 2026, PRD sudah diperbarui)

| No | Topik | Usulan |
| --- | --- | --- |
| P1 | Fallback saat model menolak | Model bisa menolak permintaan lewat pengaman otomatis (`stop_reason: "refusal"`). Untuk Opus dan Sonnet dipasang `fallbacks: "default"` (fitur beta Anthropic), sehingga permintaan yang ditolak diulang di model cadangan pilihan Anthropic dalam panggilan yang sama. Biaya dihitung per model yang benar-benar menjawab. Konten seni hampir tidak pernah memicu penolakan, jadi ini hanya jaring pengaman. Tanpa fallback, penolakan tampil sebagai toast. |
| P2 | Mode uji tanpa API | `AI_MOCK=1` di `.env` membuat semua tombol memakai jawaban contoh (streaming juga), biaya 0, dan panel menampilkan badge "Mode uji". Instruksi `uji:error`, `uji:tolak`, dan `uji:lambat` mensimulasikan kegagalan untuk menguji toast. Mode ini dipakai untuk pengembangan dan uji manual di browser. Tidak boleh aktif di produksi (dicatat di DEPLOY.md). |
| P3 | `AiRun` status `RUNNING` | Baris log dibuat **sebelum** panggilan dikirim, lalu diperbarui menjadi OK/ERROR/REFUSED. Cek batas dan pembuatan baris dijalankan dalam satu transaksi (advisory lock PostgreSQL), jadi dua klik bersamaan tidak bisa sama-sama lolos batas harian. Baris yang tertinggal di `RUNNING` (server mati di tengah jalan) tetap dihitung sebagai panggilan. |
| P4 | `AiRun.cacheWriteTokens` | Kolom baru. Menulis cache dihargai 1,25× input, jadi `costUsd` butuh jumlah token tulis cache, selain token baca cache. |
| P5 | Gaya bahasa terstruktur | `AiGuide.voiceJson` berisi pilihan tetap: santai/semi-formal/formal, campuran bahasa Inggris (tidak/sedikit/sering), sapaan (teks, mis. "kalian"), emoji (tidak/sedikit/banyak), panjang caption (pendek/sedang/panjang), dan CTA favorit. `voiceNotes` tetap ada untuk catatan bebas. Form jadi lebih cepat diisi, dan prompt mendapat instruksi yang konsisten. |

### Keputusan implementasi (sesuai PRD, tidak mengubahnya)

| Topik | Keputusan |
| --- | --- |
| Jalur panggilan | Satu Route Handler `POST /studio/ai` untuk semua fitur. Respons berupa streaming NDJSON: `partial` (hasil sementara, ±150 ms), `done` (hasil final + id run + biaya), atau `error`. Server Action tidak bisa mengirim hasil bertahap. Body berupa JSON kecil, bukan unggahan, jadi route ini tetap lewat proxy (tidak masuk pengecualian matcher). |
| Model dan effort | Pilihan model di Pengaturan: Opus 5.5 (default), Sonnet 5.5, Haiku 5.5. Harga per model dicatat di kode. Effort `medium` dipatok per fitur di kode (bawaan Opus 5.5). Thinking adaptif selalu aktif di Opus 5.5, tetapi isinya tidak dikirim ke UI. |
| Output terstruktur | `output_config.format` dari skema Zod per fitur, dikonversi sendiri (`output-schema.ts`) supaya `enum` ikut terkirim. Pilihan pilar/format/tipe hook memakai enum nama yang aktif di database, jadi API mengunci kategorinya. Hasil divalidasi lagi dengan Zod sebelum dikirim ke form. |
| Fakta yang kurang | Setiap skema output punya field `notes`. AI diminta menulis di situ jika ada data yang kurang (mis. bahan karya belum diisi), bukan mengarang. Panel menampilkan catatan ini. |
| Prompt caching | Prompt sistem = instruksi dasar + Panduan AI. Bagian ini dirender deterministik (urutan tetap, tanpa tanggal), dengan `cache_control` di akhirnya. Tugas dan data per fitur ditaruh di pesan user. Skema output (`output_config.format`) ikut menentukan cache, jadi cache berlaku per fitur (skema setiap fitur tetap). Cache berlaku 5 menit, jadi Buat ulang membaca cache. Minimum yang bisa di-cache untuk Opus 5.5 adalah 512 token; Panduan yang masih kosong mungkin belum ter-cache. |
| Prompt berversi | `src/features/ai/prompts/<fitur>.ts` berisi `version` (mis. `hook@1`), instruksi, skema, effort, dan `max_tokens`. Test menyimpan hash teks prompt per versi, jadi mengubah prompt tanpa menaikkan versi membuat test gagal. |
| Data yang dikirim | Hanya Panduan AI dan field yang relevan per fitur, disusun dari daftar field yang diizinkan (allowlist). Field form yang belum disimpan ikut dikirim (Flow 9: pilih tipe hook lalu Bantu AI). Tidak pernah dikirim: password, sesi, token, kode 2FA, harga, kontak. |
| Foto | Dibaca dari file unggahan lalu diperkecil dengan sharp menjadi WebP sisi terpanjang 1024 px (±1.000 token per foto). Karya dari foto: maks. 4 foto pilihan (default: cover + 3 berikutnya). Ide dari proyek: maks. 4 foto progres terbaru, bisa dimatikan per permintaan. Foto tidak disimpan di `AiRun`. |
| Batas | Ditolak sebelum dikirim jika AI nonaktif, biaya bulan ini ≥ batas bulanan, atau panggilan hari ini ≥ batas harian. Hari dan bulan dihitung dalam WIB. Penolakan ini tidak dicatat di `AiRun`. `max_tokens` per fitur juga membatasi biaya satu panggilan (paling mahal ±US$0,35). |
| Draf dipakai | `AiRun.accepted = true` saat pengguna menekan Pakai pada salah satu opsi run itu. Apakah form kemudian disimpan tidak dilacak. |
| Buat ulang | Mengirim hasil sebelumnya + instruksi tambahan, supaya AI tahu apa yang harus diubah ("lebih santai"). |
| Perkiraan biaya | Sebelum panggilan: median biaya 20 panggilan OK terakhir untuk fitur + model yang sama (dihitung `lib/analytics`). Jika belum ada riwayat, dipakai angka awal per fitur di kode. Setelah selesai, panel menampilkan biaya sebenarnya. |
| Status awal | Setelah migrasi, AI **nonaktif**. Andi menyalakannya di Pengaturan setelah mengisi `ANTHROPIC_API_KEY`. Pengaturan hanya menampilkan "Kunci API: terpasang/belum", tidak pernah isinya. Saat AI nonaktif, tombol Bantu AI disembunyikan. |
| Error | Pesan bahasa Indonesia per jenis: kunci API salah, batas rate/overload, jaringan, ditolak model, output terpotong/tidak valid, dibatalkan. Ditampilkan sebagai toast; isi form tidak disentuh. Menutup panel di tengah streaming membatalkan panggilan ke Claude, dan run dicatat ERROR "dibatalkan" dengan token yang sudah terpakai. |
| Set uji | 10 kasus per fitur (60 total) di `src/features/ai/evals/`, dengan Panduan AI contoh. Runner `npm run ai:eval` hanya memanggil API dengan flag `--konfirmasi`, ikut cek batas, dan tercatat di `AiRun` (`targetType = EVAL`). Pemeriksaan otomatis: skema, panjang, kata yang dihindari, hashtag dari set, enum valid. Hasil berupa laporan markdown di `.ai-evals/` (di-gitignore) untuk dibaca manual. Kasus "Karya dari foto" memakai karya berfoto di `galeri_dev`. |

### Perkiraan biaya (Opus 5.5: US$4 input / US$20 output per 1 juta token, baca cache US$0,20)

| Fitur | Perkiraan per panggilan |
| --- | --- |
| Kembangkan ide, Hook, Caption & hashtag | US$0,03-0,05 |
| Ide dari proyek (dengan 4 foto), Karya dari foto | US$0,05-0,09 |
| Script & shot list | US$0,06-0,12 |

Dengan batas US$10 per bulan, kira-kira 120-250 panggilan. Thinking ikut dihitung sebagai token output. Angka sebenarnya terlihat di log.

## Prompt pembuka untuk Claude Code

```
Baca CLAUDE.md, docs/PRD.md, dan docs/FASE-3.md sampai habis. Kerjakan Fase 3 sesuai checklist di docs/FASE-3.md.
Langkah 1-6 kamu kerjakan sendiri. Lalu pakai subagent paralel untuk langkah 7-11 (satu agent per area, hanya menyentuh folder fitur dan route-nya sendiri). Terakhir langkah 12-13, centang checklist di file ini.
Jangan memanggil API berbayar tanpa persetujuan saya; uji memakai mock.
```

## Checklist

### Fondasi (sesi utama, berurutan)

- [x] **1. Paket dan lingkungan.**
  - Pasang `@anthropic-ai/sdk` (dependency langsung).
  - `.env.example`: `ANTHROPIC_API_KEY` (kosong) dan `AI_MOCK` (contoh, dikomentari). Andi sendiri yang mengisi kunci di `.env`; isi `.env` tidak pernah ditampilkan.
  - `docs/DEPLOY.md`: kunci di `.env` server, batas pengeluaran di Anthropic Console, akses keluar ke `api.anthropic.com`, `AI_MOCK` tidak boleh ada di produksi.
  - README dan `CLAUDE.md`: perintah dan aturan baru.
- [x] **2. Schema dan migrasi `ai`.**
  - `AiGuide` (satu baris): field PRD + `voiceJson` (P5).
  - `AiRun`: field PRD + `cacheWriteTokens` (P4), enum `AiRunStatus` (`RUNNING`, `OK`, `ERROR`, `REFUSED`; P3), index `createdAt`.
  - Seed membuat baris `AiGuide` default (nonaktif, Opus 5.5, US$10, 100/hari).
  - Migrasi dibuat dengan `prisma migrate diff` lalu `migrate deploy` (cara di CLAUDE.md).
- [x] **3. Inti `src/features/ai/`** (server-only kecuali tipe).
  - `models.ts`: daftar model yang boleh dipilih + harga per juta token (input, output, tulis cache, baca cache), lalu `costUsd(usage, model)`, termasuk biaya per model saat fallback.
  - `client.ts`: satu-satunya tempat membuat klien SDK (`ANTHROPIC_API_KEY` hanya dibaca di sini), atau klien mock jika `AI_MOCK=1` (P2).
  - `guide.ts`: render Panduan AI deterministik menjadi blok system + `cache_control`.
  - `prompts/`: enam file fitur (`idea-expand`, `project-ideas`, `hook`, `script`, `caption`, `artwork-photos`), masing-masing berisi versi, skema input/output Zod, penyusun data (allowlist), effort, dan `max_tokens`.
  - `limits.ts`: cek aktif/bulanan/harian + reservasi baris `RUNNING` dalam satu transaksi.
  - `run.ts`: validasi input → cek batas → kumpulkan data → stream ke Claude (structured output, effort, fallback) → hasil sementara → validasi Zod → perbarui `AiRun` (token, biaya, durasi, status, `outputJson`) → hasil. Tidak ada tulisan ke Idea/Content/Post/Project/Artwork.
  - `errors.ts`: pemetaan error SDK (kelas error bertipe, bukan cocok-teks) ke pesan Indonesia.
  - `photos.ts`: storage key → WebP 1024 px base64.
  - `partial-json.ts`: pengurai JSON parsial untuk hasil sementara.
  - `actions.ts`: `saveAiGuide`, `markAiRunAccepted` (diawali `await requireAdmin()`).
  - `queries.ts`: Panduan AI, status (aktif, kunci terpasang, mode uji), data tab pemakaian.
  - **Test (SDK di-mock):**
    - unit: biaya, render panduan byte-identik untuk input sama, skema prompt, hash versi prompt, JSON parsial, pemetaan error;
    - integrasi: batas bulanan/harian (termasuk 5 permintaan paralel dengan sisa 1 slot), AI nonaktif, log OK/ERROR/REFUSED/dibatalkan, data rahasia tidak ada di payload ke SDK, tidak ada perubahan pada tabel konten.
- [x] **4. `src/lib/analytics/ai-usage.ts`** (fungsi murni + unit test): ringkasan bulan ini (panggilan, token, biaya, % draf dipakai) dan perkiraan biaya per fitur + model (median 20 run OK terakhir). Data kosong → 0, bukan NaN.
- [x] **5. Route Handler `src/app/studio/ai/route.ts`.**
  - Diawali `await requireAdmin()` (tercakup test statis).
  - Tolak request lintas situs (`isCrossSiteRequest`), body JSON maks. 64 KB, `feature` harus dari daftar yang dikenal.
  - Respons NDJSON. Jika request dibatalkan (`request.signal`), stream ke Claude ikut dibatalkan.
  - `routes.studio.ai` di `src/lib/routes.ts`.
  - Test integrasi: tanpa sesi → redirect, lintas situs → 403, alur `partial` → `done`, error → event `error`.
- [x] **6. Panel UI bersama `src/features/ai/components/`.**
  - `AiStatusProvider` (di layout Studio): aktif/mode uji untuk semua tombol.
  - `AiAssistButton`: tombol kecil "Bantu AI" di samping field; tidak tampil saat AI nonaktif.
  - `AiAssistPanel`: Sheet kanan di desktop, Sheet bawah di HP (375 px). Isinya kolom instruksi tambahan, tombol Buat/Buat ulang, perkiraan biaya sebelum dan biaya sebenarnya sesudah, hasil bertahap, kartu opsi dengan tombol Pakai, catatan AI, dan badge "Mode uji".
  - `useAiAssist(feature)`: fetch + baca NDJSON + state, batal saat panel ditutup. Error → toast, form tidak disentuh. Pakai → callback ke form + `markAiRunAccepted`.
  - `ProjectIdeasAssist`: panel Ide dari proyek + tombol "Simpan sebagai ide" per opsi (memakai aksi `createIdea` yang sudah ada). Dipakai di Bank Ide dan detail Proyek.
  - Unit test pembaca NDJSON dan reducer state panel.

### Fitur (boleh paralel dengan subagent; hanya folder sendiri, inti `features/ai` hanya dibaca)

- [x] **7. Pengaturan: tab Panduan AI** (`src/features/settings/`, `pengaturan/`).
  - Form: gaya bahasa (P5), contoh terbaik (maks. 10, jenis hook/caption + platform opsional), fakta kreator dan karya, hashtag per pilar × platform (+ umum), kata/topik dihindari.
  - Pengaturan teknis: aktif/nonaktif, model, batas bulanan, batas harian, status kunci API.
  - Kartu pemakaian bulan ini (dari `lib/analytics/ai-usage.ts`) + 20 run terakhir (fitur, model, status, biaya, dipakai).
- [x] **8. Bank Ide** (`src/features/ideas/`, `ide/`).
  - **Kembangkan ide** di dialog ide: 3 variasi (judul, sudut pandang, saran pilar/format/tipe hook, alasan). Pakai → mengisi form ide yang dibuka; "Simpan sebagai ide baru" → `createIdea`.
  - Tombol **Ide dari proyek** di Bank Ide: pilih proyek aktif, lalu `ProjectIdeasAssist`.
- [x] **9. Detail konten dan versi platform** (`src/features/contents/`, `src/features/posts/`, `pipeline/`).
  - **Hook:** 5 opsi sesuai tipe hook di form → `hookText`.
  - **Script & shot list:** streaming → `script`, `shotList`, `targetDurationSec`.
  - **Caption & hashtag** per versi platform: 2 opsi (TikTok lebih singkat; Instagram lebih panjang + CTA), hashtag dari set pilar + platform → `caption`, `hashtags`.
- [x] **10. Proyek** (`src/features/projects/`, `proyek/`): tombol **Ide dari proyek** di detail proyek (`ProjectIdeasAssist`, foto progres bisa dimatikan).
- [x] **11. Karya** (`src/features/artworks/`, `karya/`): **Dari foto**. Pilih maks. 4 foto + catatan. Pakai → `summary`, `description`, dan teks alternatif per foto masuk editor alt sebagai draf (belum tersimpan).

### Penutup (sesi utama)

- [x] **12. Set uji** `src/features/ai/evals/`.
  - Panduan AI contoh + 10 kasus per fitur.
  - `npm run ai:eval -- <fitur|semua> [--model …] --konfirmasi`: tanpa `--konfirmasi` hanya menampilkan jumlah kasus dan perkiraan biaya.
  - Pemeriksaan otomatis + laporan markdown di `.ai-evals/` (di-gitignore).
  - Runner dan pemeriksaannya diuji dengan SDK mock. Run asli hanya dengan persetujuan pengguna (±US$3 untuk 60 kasus).
- [x] **13. Verifikasi dan dokumentasi.**
  - `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` lolos.
  - **Uji manual mode uji** (`AI_MOCK=1`, desktop + 375 px):
    - enam tombol tampil di tempatnya; Pakai mengisi form tanpa menyimpan (reload → isi lama);
    - Buat ulang + instruksi, hasil bertahap terlihat;
    - `uji:error`/`uji:tolak` → toast, isi form utuh;
    - batas harian 1 → panggilan kedua ditolak;
    - AI nonaktif → tombol hilang;
    - tab Panduan AI tersimpan dan pemakaian bertambah.
  - Uji dengan API asli hanya jika Andi setuju (perkiraan ≤ US$0,50: satu panggilan per fitur).
  - Kunci tidak bocor: `ANTHROPIC_API_KEY`/`sk-ant` tidak ada di `.next/static`, dan respons route tidak memuat header atau isi kunci.
  - Review oleh subagent yang belum melihat kode: auth route, kebocoran kunci/data, race batas, data yang dikirim ke AI, AI tidak menulis data konten.
  - Perbarui README, `CLAUDE.md`, PRD (P1-P5 jika disetujui). Centang checklist ini dan tulis "Hasil dan keputusan implementasi".
  - Daftar file per modul untuk di-commit pengguna (termasuk perubahan `CLAUDE.md` dan `docs/PRD.md` dari sesi sebelumnya).

## Definisi selesai

- Keenam tombol Bantu AI jalan di mode uji di desktop dan 375 px, memakai satu pola panel yang sama.
- Tidak ada jalur kode yang menyimpan hasil AI tanpa klik Simpan atau "Simpan sebagai ide".
- Setiap panggilan melewati `requireAdmin()` dan cek batas, lalu tercatat di `AiRun` dengan versi prompt, token, dan biaya.
- `ANTHROPIC_API_KEY` hanya dibaca di `src/features/ai/client.ts` dan tidak ada di bundle client.
- Lint, typecheck, test, dan build lolos; checklist ini dicentang; review subagent selesai dan temuannya ditindaklanjuti atau dicatat.

## Catatan

- Paket baru: `@anthropic-ai/sdk`. Tidak ada layanan pihak ketiga lain. CSP tidak berubah, karena browser tidak pernah menghubungi Anthropic.
- Subagent fitur (langkah 7-11) tidak menjalankan `npm run build` (berbagi `.next`), dan memakai `TEST_DB_NAME` sendiri untuk test integrasi. Jika butuh perubahan di inti `features/ai`, mereka melaporkannya, bukan mengubahnya.
- Model lebih murah (Sonnet/Haiku 5.5) baru dipilih setelah dibandingkan dengan set uji (keputusan PRD 29 Okt).

## Hasil dan keputusan implementasi

Keputusan yang tidak tertulis eksplisit di PRD (yang menyangkut data sudah masuk PRD "Model data").

**Inti (langkah 1-6, sesi utama)**

- **SDK:** `@anthropic-ai/sdk` 1.3.0, `client.beta.messages.stream`. Structured output dari Zod lewat konversi sendiri `output-schema.ts` (helper SDK `betaZodOutputFormat` 1.3.0 membuang `enum` ke deskripsi, ditemukan saat review), tanpa auto-parse, supaya urutannya: cek `stop_reason` (refusal → REFUSED, max_tokens → "terpotong"), lalu `JSON.parse`, lalu validasi Zod. Batas panjang di skema = batas field form (mis. hook 300, caption 4000), sedangkan panjang yang diinginkan ditulis di deskripsi skema. Batas yang tidak didukung structured output (panjang, angka, jumlah item) dipindah ke deskripsi. Pilihan pilar/format/tipe hook = enum nama kategori aktif. "Karya dari foto" menjawab dengan nomor foto tetap "1"-"4" (bukan id), yang diterjemahkan ke `ArtworkImage.id` di `normalize`; skemanya sama apa pun foto yang dipilih, jadi grammar dan cache tidak dikompilasi ulang.
- **Model:** thinking tidak dikirim (adaptif bawaan; Opus 5.5 menolak `disabled`). `effort: "medium"` per fitur. `max_tokens` 6.000-16.000 per fitur. Fallback `fallbacks: "default"` + beta `server-side-fallback-2026-07-01` untuk Opus/Sonnet, bukan Haiku. Teks dari model yang menolak dibuang (hanya teks setelah blok `fallback` terakhir), dan hasil sementara di panel direset saat fallback mengambil alih.
- **Biaya:** dari `usage.iterations` (per percobaan, dengan harga model yang menjalankannya), atau usage tingkat atas jika tidak ada iterasi. Harga di `src/features/ai/models.ts`. Model tak dikenal dihitung dengan harga termahal. `costUsd` Float (perkiraan untuk batas, bukan pembukuan).
- **Prompt:** prompt sistem = instruksi dasar (`base@1`) + Panduan AI yang dirender deterministik, satu blok dengan `cache_control` (cache per fitur, karena skema output ikut menentukan cache). Tugas dan data ada di pesan user (`<tugas>`, `<data>`, `<hasil_sebelumnya>`, `<instruksi_tambahan>`); isi `<data>` dan `<hasil_sebelumnya>` ditandai sebagai bahan, bukan instruksi, dan tag struktur di dalam isi form di-escape (`‹data>`). Versi dicatat `hook@1+base@1`; semua tetap `@1` karena perubahan setelah review terjadi sebelum ada panggilan API asli. Test hash (`prompts.test.ts`) gagal jika teks tugas/skema/instruksi dasar berubah tanpa versi baru.
- **Data:** definisi prompt murni (tanpa DB) di `prompts/`; pengambil data per fitur di `context.ts` (allowlist field, id dari client diterjemahkan ke nama di server; foto karya hanya milik karya itu). Test integrasi memastikan WhatsApp, email kontak, harga, hash password, dan id foto karya lain tidak ada di payload ke SDK.
- **Batas:** cek + reservasi baris `RUNNING` dalam satu transaksi dengan `pg_advisory_xact_lock` (test: 5 permintaan paralel dengan sisa 1 slot → hanya 1 dikirim). Baris RUNNING membawa biaya terburuk (input + `max_tokens` output, harga termahal bila ada fallback) sampai biaya sebenarnya tercatat, sehingga panggilan yang sedang berjalan ikut terhitung di batas bulanan. Baris RUNNING > 15 menit (server mati) dirapikan jadi ERROR saat reservasi berikutnya, dengan biaya pesanan tetap dihitung. Klien yang sudah pergi sebelum reservasi tidak memakai slot. AI nonaktif dicek sebelum mengambil data dan dicek ulang di transaksi. Set uji boleh jalan saat AI nonaktif, tetapi tetap kena batas biaya/harian.
- **Route `POST /studio/ai`:** `requireAdmin()`, tolak lintas situs (`isCrossSiteRequest`), body maks. 64 KB, respons NDJSON (`partial` paling cepat tiap 150 ms, lalu `done`/`error`) dengan `Cache-Control: no-store, no-transform`. Caddyfile tidak mengompres `/studio/ai` supaya potongan tidak tertahan. Koneksi klien putus → `request.signal` membatalkan stream ke Claude → AiRun ERROR "Dibatalkan." dengan token yang sudah terpakai. Tanpa sesi, proxy mengarahkan ke `/masuk` (HTML); panel menampilkan "Sesi Studio berakhir".
- **Hasil sementara:** pengurai JSON parsial sendiri (`partial-json.ts`), karena pengurai SDK membuang string yang belum selesai (script panjang baru muncul setelah selesai).
- **Mode uji (`AI_MOCK=1`):** jawaban contoh per fitur yang lolos skema, dialirkan bertahap, model `mock`, biaya 0, tetap lewat cek batas dan tercatat di AiRun. Instruksi `uji:error`, `uji:tolak`, `uji:terpotong`, `uji:lambat` mensimulasikan kegagalan.
- **Panel:** `useAiAssist(fitur)` memegang state panel, streaming, batal, dan `apply` (isi form → tandai dipakai → toast "Belum tersimpan" → tutup panel). Hasil lama tetap tampil jika Buat ulang gagal. Panel berupa Sheet kanan (desktop) atau bawah (HP, maks. 88% tinggi layar). Status AI dan perkiraan biaya per fitur dimuat sekali di layout Studio (`AiStatusProvider`); tombol Bantu AI tersembunyi saat AI nonaktif.
- **Set uji:** 10 kasus per fitur teks (`evals/cases.ts`) dengan Panduan AI contoh tetap (`evals/fixtures.ts`). Kasus "Karya dari foto" = 10 karya berfoto terbaru di database; teks Galeri yang sudah ada tidak dikirim. Runner `npm run ai:eval` (tsx `--conditions=react-server`) memakai `executeAiCall` yang sama dengan Studio, berhenti jika batas tercapai, dan menulis laporan ke `.ai-evals/`. Sudah dicoba penuh dengan `AI_MOCK=1` (6/6 lolos).

**Fitur (langkah 7-11, subagent paralel per area)**

- **Pengaturan → Panduan AI (7):** tab setelah "Profil publik". Urutan kartu: pengaturan teknis → pemakaian bulan ini → isi panduan (form panjang terakhir). Hashtag diketik bebas lalu dirapikan `parseHashtags` saat simpan ("gambar, clay" → "#gambar #clay"), penghitung n/30 per set. Hashtag pilar nonaktif tetap tersimpan tanpa ditampilkan; set pilar yang sudah dihapus dibuang. Hanya status "Kunci API: terpasang/belum" yang tampil, plus peringatan jika AI dinyalakan tanpa kunci. 20 run terakhir dilipat (`<details>`), berupa kartu di HP dan tabel mulai 768 px; run set uji berbadge "Set uji".
- **Bank Ide (8):** "Kembangkan ide" di baris label Judul dialog ide (tambah dan edit). Pakai mengisi judul, catatan (sudut pandang + saran format/hook + alasan), dan pilar; "Simpan sebagai ide baru" memakai `createIdea`. "Ide dari proyek" di header Bank Ide memilih dari proyek yang belum selesai (tersembunyi jika tidak ada). Catatan: jika Bank Ide masih kosong dan dialog dibuka dari "Tambah ide pertama", "Simpan sebagai ide baru" ikut menutup dialog (tampilan kosong berganti daftar); variasinya tetap tersimpan.
- **Detail konten + versi platform (9):** Hook dan Script & shot list di baris label field. Script punya "Pakai semua", "Pakai script", "Pakai shot list" (yang terakhir dua tidak menutup panel). Caption & hashtag per versi platform membaca isi form detail konten saat ini (termasuk yang belum disimpan) lewat `ContentDraftProvider`, dengan cadangan nilai tersimpan; `aria-label` membedakan tombol TikTok dan Instagram.
- **Proyek (10):** "Ide dari proyek" di kepala bagian "Konten seri", sebelum Buat Seri.
- **Karya (11):** "Dari foto" di label Ringkasan. Pemilih foto (thumbnail, maks. 4, default cover + 3 berikutnya, foto karya jadi didahulukan) dan "Catatan untuk AI". Teks alternatif masuk sebagai draf per foto (context per halaman, badge "draf AI", tombol Buang/Simpan; blur tidak menyimpan draf), plus pemberitahuan "N teks alternatif dari AI masih draf". `MAX_ARTWORK_AI_PHOTOS` dipindah ke `features.ts` supaya client tidak memuat teks prompt.

**Verifikasi dan uji manual (langkah 13, 29 Okt 2026)**

- `npm run lint`, `npm run typecheck`, `npm run test` (69 file, 650 test, termasuk integrasi ke `galeri_test`), `npm run build` lolos. Bundle client (`.next/static`) tidak memuat kunci, teks prompt, atau SDK; satu-satunya kecocokan adalah nama variabel `ANTHROPIC_API_KEY` di teks petunjuk Pengaturan.
- Uji manual di build produksi lokal dengan mode uji (konfigurasi preview `content-planner-ai-mock`, `AI_MOCK=1`), desktop + 375 px:
  - Pengaturan: nyalakan AI, simpan panduan, hashtag dinormalisasi, pemakaian bertambah (OK/gagal/ditolak terhitung terpisah).
  - Hook: 5 opsi, Pakai mengisi field + toast "Belum tersimpan", tombol Simpan aktif.
  - Script: hasil tampil bertahap (76 → 610 karakter selama streaming lewat `next start`), memakai teks hook yang belum disimpan, Buat ulang + instruksi diteruskan, Pakai semua mengisi 3 field.
  - Caption: hanya versi TikTok yang terisi; versi Instagram tidak tersentuh.
  - `uji:error` / `uji:tolak` → toast, opsi lama dan isi form utuh. Batas harian tercapai → toast, panggilan tidak dikirim.
  - Bank Ide: Kembangkan ide (Buat mati jika judul kosong; Pakai mengisi form dialog), Ide dari proyek (Part melanjutkan seri; Simpan sebagai ide → "Tersimpan").
  - Karya: 4 foto terpilih, Pakai semua → ringkasan/cerita di form + 4 draf alt berbadge.
  - Database setelah semua Pakai: konten, versi platform, ringkasan, dan teks alternatif karya tidak berubah; hanya ide yang disimpan eksplisit yang bertambah. AiRun: Pakai → `accepted`, error → ERROR, tolak → REFUSED.
  - AI nonaktif → semua tombol Bantu AI hilang dan route mengembalikan "Asisten AI nonaktif"; tanpa sesi → redirect ke `/masuk`.
  - 375 px: tanpa overflow horizontal di Pipeline, Proyek, Pengaturan; panel dari bawah selebar layar.
  - Data uji ("[Uji AI]"), log AiRun mode uji, dan isi Panduan AI uji dihapus lagi dari `galeri_dev` setelah pengujian (AI kembali nonaktif).
- Uji dengan API asli belum dilakukan (menunggu kunci dan persetujuan pengguna; perkiraan ≤ US$0,50 untuk satu panggilan per fitur).

**Review (subagent baru, 29 Okt 2026) dan tindak lanjutnya**

- **[Sedang] `enum` hilang dari skema terkirim** (helper SDK memindahkannya ke deskripsi) → kategori dan id foto tidak dikunci API; jawaban "Timelapse" akan menggagalkan seluruh hasil yang sudah dibayar. Diperbaiki dengan `output-schema.ts` (enum/const dipertahankan, aturan structured output lainnya sama) + test bahwa skema setiap fitur memenuhi aturan API dan memuat enum.
- **[Sedang] Biaya run yang dibatalkan/putus tercatat hampir hanya input** (usage output baru datang di akhir stream). Sekarang `streamClaude` memperkirakan token output saat stream putus sebelum `message_delta`: maks(dilaporkan, karakter/3, durasi × 100 token/detik), dibatasi `max_tokens`; AiRun ditandai "(biaya diperkirakan)". Test dengan SSE palsu.
- **[Rendah] Batas bulanan tidak menghitung run yang masih berjalan** → biaya terburuk dipesan saat reservasi (lihat "Batas"); test 5 panggilan paralel. Run RUNNING tertinggal dirapikan (test).
- **[Rendah] Cache tidak dipakai bersama antar fitur** (mengubah `output_config.format` membatalkan cache) → dokumen dikoreksi; skema "Karya dari foto" dibuat tetap (nomor foto).
- **[Rendah] Ide dari proyek tersimpan dengan proyek yang salah setelah pilihan diganti** → hasil diingat bersama proyeknya ("Hasil untuk proyek …"); simpan memakai proyek itu; Buat ulang untuk proyek lain tidak mengirim hasil proyek sebelumnya (uji browser).
- **[Rendah] Error server tampil sebagai "Sesi berakhir"** → pesan sesi hanya jika dialihkan ke `/masuk`; respons non-NDJSON lain → "Server tidak bisa memproses permintaan AI (error N)".
- **[Rendah] Batal sebelum reservasi memakai satu slot harian** → `signal.aborted` dicek sebelum reservasi (test).
- **Info yang ditindaklanjuti:** batas body route dihitung dalam byte; kategori penolakan (`stop_details.category`) dicatat di AiRun; perkiraan biaya awal Sonnet/Haiku disesuaikan harga model; `excerpt(…, 0)` tidak mengirim apa pun; `MAX_ARTWORK_AI_PHOTOS` pindah ke `features.ts` (client tidak memuat teks prompt).
- **Tidak dikerjakan (dicatat):** test hook `useAiAssist` di React (proyek belum punya testing library komponen; perilakunya diuji di browser), dan pemantauan rasio "terpotong" untuk hook (`max_tokens` 6.000 termasuk thinking) setelah ada data run asli.
- Setelah perbaikan: `lint`, `typecheck`, `test` (71 file, 671 test), `build` lolos; uji ulang di browser (mode uji) untuk "Karya dari foto" dengan pilihan foto tidak berurutan dan "Ide dari proyek" dengan ganti proyek.
