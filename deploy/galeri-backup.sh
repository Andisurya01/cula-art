#!/usr/bin/env bash
# /usr/local/bin/galeri-backup — backup harian database + foto unggahan.
# Dijalankan root lewat cron (lihat docs/DEPLOY.md). Menyimpan 14 hari terakhir di /var/backups/galeri;
# salinan ke lokasi lain diambil dari sini (laptop atau penyimpanan lain).
# Backup berisi hash password dan secret 2FA: set AGE_RECIPIENT (kunci publik age) supaya file
# dienkripsi; kunci privatnya disimpan di luar server (pengelola password).
set -euo pipefail

DB_NAME="${DB_NAME:-galeri_prod}"
UPLOAD_DIR="${UPLOAD_DIR:-/srv/galeri/uploads}"
DEST="${DEST:-/var/backups/galeri}"
KEEP_DAYS="${KEEP_DAYS:-14}"
BACKUP_GROUP="${BACKUP_GROUP:-root}"   # grup yang boleh membaca (user SSH untuk salinan off-site)
AGE_RECIPIENT="${AGE_RECIPIENT:-}"     # mis. age1… ; kosong = tanpa enkripsi
STAMP="$(date +%Y-%m-%d)"

install -d -m 750 -g "$BACKUP_GROUP" "$DEST"

# Format custom: dipulihkan dengan pg_restore; terkompresi.
runuser -u postgres -- pg_dump --format=custom --no-owner "$DB_NAME" > "$DEST/db-$STAMP.dump.tmp"
mv "$DEST/db-$STAMP.dump.tmp" "$DEST/db-$STAMP.dump"

tar -C "$(dirname "$UPLOAD_DIR")" -czf "$DEST/uploads-$STAMP.tar.gz.tmp" "$(basename "$UPLOAD_DIR")"
mv "$DEST/uploads-$STAMP.tar.gz.tmp" "$DEST/uploads-$STAMP.tar.gz"

# Cek cepat: dump bisa dibaca.
runuser -u postgres -- pg_restore --list "$DEST/db-$STAMP.dump" > /dev/null

if [ -n "$AGE_RECIPIENT" ]; then
  for f in "$DEST/db-$STAMP.dump" "$DEST/uploads-$STAMP.tar.gz"; do
    age --encrypt --recipient "$AGE_RECIPIENT" --output "$f.age" "$f"
    rm -f "$f"
  done
fi

find "$DEST" -maxdepth 1 -type f \( -name 'db-*' -o -name 'uploads-*' \) -mtime "+$KEEP_DAYS" -delete
chgrp "$BACKUP_GROUP" "$DEST"/*
chmod 640 "$DEST"/*

echo "Backup $STAMP selesai: $(du -sh "$DEST" | cut -f1) di $DEST"
