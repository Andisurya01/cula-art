# Deploy ke VPS

Panduan langkah 11 Fase 2: Galeri & Studio Karya live di satu domain. Dikerjakan bersama; **pembelian domain, VPS, dan pembuatan akun penyedia dilakukan pengguna sendiri**.

```
Pengunjung ──HTTPS──▶ Caddy :443 (sertifikat otomatis, HSTS, gzip/zstd)
                        │
                        ▼
                 Next.js 127.0.0.1:3000  (systemd: galeri.service, user `galeri`)
                   │              │
                   ▼              ▼
            PostgreSQL 18    /srv/galeri/uploads   (foto, di luar folder rilis)
                   │              │
                   └──── cron 02.30: /var/backups/galeri (14 hari) ──▶ salinan di lokasi lain
```

File contoh yang disalin ke server ada di folder [`deploy/`](../deploy): `Caddyfile`, `galeri.service`, `galeri-backup.sh`.

Di semua perintah: ganti `namaanda.com` dengan domain sebenarnya. Perintah dijalankan di server lewat SSH kecuali disebut lain.

## 0. Yang disiapkan pengguna

| Hal | Rekomendasi |
| --- | --- |
| Domain | Nama final (lihat PRD "Pertanyaan terbuka"). Di panel DNS: record `A` (dan `AAAA` jika ada IPv6) untuk `namaanda.com` dan `www` → IP VPS. |
| VPS | Ubuntu 24.04 LTS, region Singapura atau Jakarta, minimal 1 vCPU, 2 GB RAM (build Next.js butuh memori), 25 GB disk. |
| Akses | Login SSH dengan key (bukan password). Simpan IP, user awal, dan key di pengelola password. |
| Repo | Kode sudah di-commit dan di-push ke repo Git privat (mis. GitHub). Server menarik kode dari sana dengan *deploy key* read-only. |

## 1. Server dasar

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl ufw unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades   # pilih Yes

# Firewall: hanya SSH dan web
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable

# Matikan login SSH dengan password (pastikan login dengan key sudah jalan dulu!)
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh

# User aplikasi tanpa shell login, folder aplikasi + unggahan
sudo useradd --system --create-home --home-dir /srv/galeri --shell /usr/sbin/nologin galeri
sudo install -d -o galeri -g galeri -m 750 /srv/galeri/uploads
```

Zona waktu server boleh tetap UTC; aplikasi menghitung WIB sendiri.

## 2. Node.js LTS

Node 20 sudah melewati masa dukungan (April 2026). Pakai Node 24 LTS di server.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v24.x
```

## 3. PostgreSQL 18

Sama dengan versi development.

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt install -y postgresql-18

# Role + database produksi. Buat password acak dan simpan di pengelola password.
openssl rand -base64 30
sudo -u postgres psql -c "CREATE ROLE galeri LOGIN PASSWORD 'TEMPEL_PASSWORD_DI_SINI';"
sudo -u postgres createdb --owner=galeri --encoding=UTF8 --template=template0 galeri_prod
```

PostgreSQL hanya mendengar di localhost secara default; biarkan begitu.

## 4. Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Caddyfile dipasang di langkah 7, setelah aplikasi jalan.

## 5. Kode aplikasi

```bash
# Deploy key read-only untuk repo privat
sudo -u galeri install -d -m 700 /srv/galeri/.ssh
sudo -u galeri ssh-keygen -t ed25519 -N "" -f /srv/galeri/.ssh/id_ed25519
sudo cat /srv/galeri/.ssh/id_ed25519.pub
#   → tempel di GitHub: repo → Settings → Deploy keys → Add (tanpa izin tulis)

sudo -u galeri git clone git@github.com:USER/REPO.git /srv/galeri/app
```

`.env` produksi (tidak pernah di-commit):

```bash
sudo -u galeri tee /srv/galeri/app/.env > /dev/null <<'EOF'
DATABASE_URL="postgresql://galeri:TEMPEL_PASSWORD_DI_SINI@localhost:5432/galeri_prod?schema=public"
UPLOAD_DIR="/srv/galeri/uploads"
SITE_URL="https://namaanda.com"
EOF
sudo chmod 600 /srv/galeri/app/.env
```

`SITE_URL` dipakai saat build (sitemap, Open Graph) dan saat jalan (tautan WhatsApp). `DATABASE_URL_TEST` tidak dibutuhkan di server.

Build pertama:

```bash
cd /srv/galeri/app
sudo -u galeri npm ci                       # juga prisma generate
sudo -u galeri npx prisma migrate deploy    # semua migrasi ke galeri_prod
sudo -u galeri npx prisma db seed           # pilar, format, hook, checklist, pengaturan default
sudo -u galeri npm run build                # butuh database jalan (halaman Galeri di-prerender)
```

## 6. Service systemd

```bash
sudo cp /srv/galeri/app/deploy/galeri.service /etc/systemd/system/galeri.service
sudo systemctl daemon-reload
sudo systemctl enable --now galeri
sudo systemctl status galeri --no-pager
curl -s http://127.0.0.1:3000/api/health    # {"ok":true,"database":"ok"}
```

Log aplikasi: `journalctl -u galeri -f`.

## 7. Caddy + HTTPS

```bash
sudo cp /srv/galeri/app/deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/namaanda\.com/DOMAIN-ANDA.com/g' /etc/caddy/Caddyfile
sudo install -d -o caddy -g caddy /var/log/caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

DNS harus sudah mengarah ke VPS supaya sertifikat terbit. Cek dari laptop:

```bash
curl -sI https://namaanda.com | grep -iE "strict-transport|content-security|x-frame|referrer"
curl -s https://namaanda.com/api/health
curl -s https://namaanda.com/robots.txt
```

## 8. Akun admin

```bash
cd /srv/galeri/app
sudo -u galeri npm run admin:create
```

Lalu buka `https://namaanda.com/masuk` dari laptop: masuk dengan email + password, pindai QR dengan aplikasi authenticator, **simpan 10 kode pemulihan** (pengelola password atau cetak).

Darurat (dijalankan di server):

| Masalah | Perintah |
| --- | --- |
| HP hilang, kode pemulihan habis/hilang | `sudo -u galeri npm run admin:reset-2fa` (semua sesi dicabut, login berikutnya setup 2FA ulang) |
| Lupa password | `sudo -u galeri npm run admin:reset-password` |
| Terkunci karena salah 5× | Tunggu 15 menit (kunci per IP, IPv6 per /64, dan per email) |

**Email akun admin sebaiknya berbeda dari email kontak publik** (Pengaturan → Profil publik). Siapa pun yang tahu email admin bisa sengaja salah password 5× tiap 15 menit dan membuat login terkunci; email yang tidak dipublikasikan menutup celah itu.

## 9. Backup harian

Backup berisi hash password dan secret 2FA, jadi **enkripsi sebelum keluar dari server** dengan [age](https://github.com/FiloSottile/age): buat pasangan kunci **di laptop**, simpan kunci privat di pengelola password, dan hanya kunci publik (`age1…`) yang ditaruh di server.

```bash
sudo apt install -y age
sudo groupadd --system galeri-backup
sudo usermod -aG galeri-backup USER_SSH_ANDA        # user yang menarik salinan off-site

sudo cp /srv/galeri/app/deploy/galeri-backup.sh /usr/local/bin/galeri-backup
sudo chmod 750 /usr/local/bin/galeri-backup
sudo BACKUP_GROUP=galeri-backup AGE_RECIPIENT=age1TEMPEL_KUNCI_PUBLIK /usr/local/bin/galeri-backup   # coba sekali
ls -lh /var/backups/galeri                         # db-*.dump.age, uploads-*.tar.gz.age

# Setiap hari 02.30 WIB (= 19.30 UTC)
echo '30 19 * * * root BACKUP_GROUP=galeri-backup AGE_RECIPIENT=age1TEMPEL_KUNCI_PUBLIK /usr/local/bin/galeri-backup >> /var/log/galeri-backup.log 2>&1' | sudo tee /etc/cron.d/galeri-backup
```

**Salinan di lokasi lain** (wajib; backup di disk yang sama ikut hilang jika VPS hilang). Pilih satu, keputusan pengguna:

- **A. Ditarik ke laptop (tanpa layanan tambahan).** Di Windows, Task Scheduler harian menjalankan:

  ```powershell
  scp -r galeri-admin@IP_VPS:/var/backups/galeri "D:\Backup\galeri"
  ```

  User SSH itu anggota grup `galeri-backup`, jadi boleh membaca `/var/backups/galeri`. Hanya jalan saat laptop menyala.
- **B. Penyimpanan objek (S3-compatible, mis. Backblaze B2/Cloudflare R2) lewat `rclone`.** Otomatis walau laptop mati, tapi menambah satu layanan pihak ketiga (biaya kecil per GB).

### Uji pulihkan (lakukan sekali setelah live, lalu tiap beberapa bulan)

Jika backup dienkripsi, dekripsi dulu dengan kunci privat (di laptop, atau salin sementara ke server lalu hapus): `age --decrypt -i kunci.txt -o db-$STAMP.dump db-$STAMP.dump.age`, sama untuk `uploads-*.tar.gz.age`.

```bash
STAMP=$(date +%Y-%m-%d)
sudo -u postgres createdb --owner=galeri galeri_restore
sudo -u postgres pg_restore --no-owner --role=galeri -d galeri_restore /var/backups/galeri/db-$STAMP.dump
sudo -u postgres psql -d galeri_restore -c 'SELECT count(*) AS karya FROM "Artwork";'
sudo -u postgres dropdb galeri_restore

mkdir -p /tmp/uji-uploads && tar -C /tmp/uji-uploads -xzf /var/backups/galeri/uploads-$STAMP.tar.gz
ls /tmp/uji-uploads/uploads | wc -l; ls /srv/galeri/uploads | wc -l   # jumlah file sama
rm -rf /tmp/uji-uploads
```

Pulihkan sungguhan: `systemctl stop galeri`, `pg_restore --clean --if-exists -d galeri_prod …`, ekstrak `uploads` ke `/srv/galeri/`, `systemctl start galeri`.

## 10. Update aplikasi

Di laptop: commit dan push. Di server:

```bash
cd /srv/galeri/app
sudo -u galeri git pull
sudo -u galeri npm ci
sudo -u galeri npx prisma migrate deploy
sudo systemctl stop galeri          # build menimpa .next; hentikan dulu (±1-2 menit offline)
sudo -u galeri npm run build
sudo systemctl start galeri
curl -s http://127.0.0.1:3000/api/health
```

Jika build gagal, server masih berhenti: perbaiki lalu build ulang, atau `git checkout <commit-sebelumnya>` + `npm ci` + build.

## 11. Setelah live (checklist)

- [ ] Akun admin + 2FA aktif, 10 kode pemulihan tersimpan.
- [ ] Pengaturan → Profil publik: nama situs, tagline, bio, foto, kota, WhatsApp (`62…`), email, handle IG/TikTok.
- [ ] Terbitkan minimal 1 karya (foto + teks alternatif), cek muncul di `/` dan `/karya`.
- [ ] Dari HP lewat domain: Beranda, Katalog, Detail, Tentang nyaman dibaca; tombol "Tanya karya ini" membuka WhatsApp dengan judul + tautan.
- [ ] `https://namaanda.com/studio` dalam keadaan logout diarahkan ke `/masuk`.
- [ ] Backup pertama ada di `/var/backups/galeri` dan salinannya di lokasi lain; uji pulihkan sekali.
- [ ] Tautan di bio TikTok/Instagram diganti ke domain baru.
- [ ] (Opsional) Daftarkan `https://namaanda.com/sitemap.xml` di Google Search Console.

## Masalah umum

| Gejala | Periksa |
| --- | --- |
| 502 dari Caddy | `systemctl status galeri`, `journalctl -u galeri -n 100` |
| `/api/health` 503 | PostgreSQL jalan? `DATABASE_URL` benar? `systemctl status postgresql` |
| Sertifikat tidak terbit | DNS belum mengarah ke VPS, port 80/443 tertutup (`ufw status`) |
| Foto gagal diunggah | Ukuran > 15 MB atau HEIC; izin tulis `/srv/galeri/uploads` (pemilik `galeri`) |
| Login selalu kembali ke `/masuk` | Akses lewat `http://` atau IP: cookie sesi `Secure` hanya terkirim lewat HTTPS domain |
| Perubahan karya tidak muncul di Galeri | Halaman di-cache; aksi Studio me-revalidate otomatis, cadangan maksimal 1 jam |
| Foto yang dihapus masih terbuka lewat `/_next/image?url=…` | Varian hasil optimasi disimpan maks. 1 hari. Untuk menghapus segera: `sudo rm -rf /srv/galeri/app/.next/cache/images` |
