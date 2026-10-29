// Logika murni pembatasan login: 5 gagal dalam 15 menit (per IP dan per email) → kunci 15 menit.

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_LOCK_MS = 15 * 60_000;
/** Rentang riwayat yang perlu dibaca untuk menghitung kunci. */
export const LOGIN_LOOKBACK_MS = LOGIN_WINDOW_MS + LOGIN_LOCK_MS;

export type LoginAttemptRecord = { success: boolean; createdAt: Date };

/**
 * Waktu kunci berakhir, atau null jika tidak terkunci.
 * Kunci terjadi saat ada 5 kegagalan berurutan dalam rentang 15 menit, dan berlaku 15 menit sejak
 * kegagalan ke-5. Login sukses mengosongkan hitungan. Percobaan selama terkunci tidak dicatat,
 * jadi kunci tidak bisa diperpanjang terus-menerus.
 */
export function lockedUntil(attempts: LoginAttemptRecord[], now: Date): Date | null {
  const sorted = [...attempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let lastSuccess = -1;
  sorted.forEach((a, i) => {
    if (a.success) lastSuccess = i;
  });
  const failures = sorted
    .slice(lastSuccess + 1)
    .filter((a) => !a.success)
    .map((a) => a.createdAt.getTime());

  let until: number | null = null;
  for (let i = LOGIN_MAX_FAILURES - 1; i < failures.length; i++) {
    if (failures[i] - failures[i - LOGIN_MAX_FAILURES + 1] <= LOGIN_WINDOW_MS) {
      const end = failures[i] + LOGIN_LOCK_MS;
      if (end > now.getTime() && (until === null || end > until)) until = end;
    }
  }
  return until === null ? null : new Date(until);
}

/** "Coba lagi dalam 12 menit." */
export function lockedMessage(until: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
  return `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`;
}

/**
 * Kelompok IP untuk kunci: IPv4 apa adanya; IPv6 per /64, karena satu pelanggan biasanya memegang
 * satu /64 dan bisa berganti alamat di dalamnya untuk lolos kunci per IP.
 */
export function ipGroup(ip: string): string {
  const clean = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const mapped = clean.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (!clean.includes(":")) return clean;

  let parts: string[];
  if (clean.includes("::")) {
    const [head, tail] = clean.split("::");
    const h = head ? head.split(":") : [];
    const t = tail ? tail.split(":") : [];
    parts = [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  } else {
    parts = clean.split(":");
  }
  if (parts.length !== 8 || !parts.every((p) => /^[0-9a-f]{1,4}$/.test(p))) return clean;
  return `${parts.slice(0, 4).map((p) => parseInt(p, 16).toString(16)).join(":")}::/64`;
}

export function attemptKeys({ ip, email }: { ip: string; email: string }): string[] {
  return [`ip:${ipGroup(ip)}`, `email:${email.trim().toLowerCase()}`];
}
