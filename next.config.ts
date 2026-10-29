import type { NextConfig } from "next";

// cacheComponents sengaja tidak diaktifkan: Studio selalu membaca data terbaru (layout studio
// memakai force-dynamic), sedangkan halaman Galeri di-cache dan di-revalidate saat karya disimpan.

const isDev = process.env.NODE_ENV === "development";

// CSP tanpa nonce supaya halaman Galeri tetap bisa di-cache. 'unsafe-inline' untuk skrip dibutuhkan
// skrip inline Next.js dan next-themes; tidak ada skrip/iframe pihak ketiga. HSTS dipasang di Caddy.
function contentSecurityPolicy({ externalImages }: { externalImages: boolean }) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Studio: foto progres/referensi lama boleh berupa URL https eksternal. Galeri: hanya file sendiri.
    `img-src 'self' data: blob:${externalImages ? " https:" : ""}`,
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = (csp: string) => [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Default 1 tahun membuat header ISR `stale-while-revalidate=31532400`, sehingga browser pengunjung
  // bisa menyajikan halaman Galeri versi lama (mis. karya yang baru ditarik ke Draft) sekali lagi.
  // Disamakan dengan revalidate layout Galeri (3600 detik): tanpa jendela stale di browser.
  expireTime: 3600,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Hanya file unggahan (/media/<key>) yang dioptimasi, tanpa query string.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    formats: ["image/webp"],
    // Varian hasil optimasi disimpan 1 hari: foto yang dihapus (mis. karena privasi) paling lama sehari
    // masih tersaji dari .next/cache/images. Hapus folder itu jika harus hilang segera.
    minimumCacheTTL: 86_400,
  },
  experimental: {
    // proxy.ts membuffer body setiap request /studio yang cocok. Route unggah tidak lewat proxy
    // (lihat matcher), jadi cukup untuk Server Action (dibatasi 1 MB oleh Next).
    proxyClientMaxBodySize: "2mb",
  },
  async headers() {
    const studio = securityHeaders(contentSecurityPolicy({ externalImages: true }));
    return [
      // Sumber saling lepas supaya satu path hanya mendapat satu header CSP.
      {
        source: "/:path((?!studio(?:/|$)).*)",
        headers: securityHeaders(contentSecurityPolicy({ externalImages: false })),
      },
      { source: "/studio", headers: studio },
      { source: "/studio/:path*", headers: studio },
    ];
  },
};

export default nextConfig;
