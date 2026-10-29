import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// .env lokal (DATABASE_URL_TEST); variabel yang sudah ada di environment tidak ditimpa.
try {
  process.loadEnvFile(".env");
} catch {
  // tanpa .env: test integrasi gagal dengan pesan jelas di src/test/global-setup.ts
}

// TEST_DB_NAME (opsional) mengganti nama database di DATABASE_URL_TEST, mis. galeri_a7_test,
// supaya beberapa run test integrasi bisa berjalan bersamaan tanpa saling mengosongkan tabel.
if (process.env.DATABASE_URL_TEST && process.env.TEST_DB_NAME) {
  const url = new URL(process.env.DATABASE_URL_TEST);
  url.pathname = `/${process.env.TEST_DB_NAME}`;
  process.env.DATABASE_URL_TEST = url.toString();
}

// Semua test (unit maupun integrasi) hanya boleh menyentuh database test, tidak pernah galeri_dev.
const testEnv = {
  DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
  // Per proses, supaya beberapa run test bersamaan tidak saling menghapus file.
  UPLOAD_DIR: fileURLToPath(new URL(`./.test-uploads/${process.pid}`, import.meta.url)),
  SITE_URL: "https://galeri.test",
};

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Paket penanda "server-only" melempar error di luar React Server; di test cukup modul kosong.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: testEnv,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        // Test integrasi ke galeri_test: berurutan karena berbagi satu database.
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./src/test/global-setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
