// Sekali sebelum test integrasi: pastikan DATABASE_URL_TEST menunjuk database *_test,
// lalu terapkan semua migrasi Prisma ke sana.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST belum diisi di .env (mis. postgresql://galeri:…@localhost:5432/galeri_test). " +
        "Test integrasi tidak dijalankan ke database lain.",
    );
  }
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`DATABASE_URL_TEST harus menunjuk database berakhiran _test (sekarang: ${name}).`);
  }
  return url;
}

export default function setup() {
  const url = assertTestDatabaseUrl(process.env.DATABASE_URL_TEST);
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy ke database test gagal:\n${result.stdout}\n${result.stderr}`);
  }
}
