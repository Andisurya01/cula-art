// Service worker Studio (E10 di docs/FASE-5.md). Ditulis sendiri, tanpa Serwist: lihat "Hasil dan keputusan
// implementasi" di docs/FASE-5.md.
//
// - Didaftarkan hanya dari layout Studio dengan scope "/studio" (Beranda /studio + semua /studio/*).
//   Galeri tidak pernah mendaftarkannya.
// - File statis di luar /studio, jadi tidak lewat proxy dan tidak butuh login. Tidak berisi data.
// - Yang di-cache HANYA halaman offline, manifest, dan ikon Studio. HTML Studio (data pribadi) tidak pernah
//   di-cache: navigasi selalu ke jaringan; jika gagal (offline / server mati) → halaman offline.
// - Permintaan lain (RSC, Server Action, /studio/ai, /media, /_next/static) tidak disentuh.
//
// Mengubah file ini atau halaman offline → naikkan VERSION supaya cache lama dibuang.

const VERSION = "studio-v3";
const CACHE = `${VERSION}-offline`;
const OFFLINE_URL = "/studio-offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/studio.webmanifest",
  "/studio-icons/icon-192.png",
  "/studio-icons/icon-512.png",
  "/studio-icons/icon-maskable-512.png",
];
/** Cache offline diperbarui dari jaringan paling sering sekali per 6 jam (setelah navigasi Studio berhasil). */
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

const reload = (url) => new Request(url, { cache: "reload" });

/**
 * Isi ulang cache jika kosong (mis. setelah logout menghapusnya) atau lebih tua dari 6 jam, diukur dari header
 * Date respons halaman offline yang tersimpan (memori service worker hilang setiap kali ia dihentikan browser).
 */
async function ensurePrecache() {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(OFFLINE_URL);
  const savedAt = cached ? Date.parse(cached.headers.get("date") ?? "") : Number.NaN;
  if (cached && Number.isFinite(savedAt) && Date.now() - savedAt < REFRESH_EVERY_MS) return;
  try {
    await cache.addAll(PRECACHE.map(reload));
  } catch {
    // tetap pakai versi yang sudah ada
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(reload)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("studio-") && key !== CACHE).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

async function offlineResponse() {
  const cached = await caches.match(OFFLINE_URL, { cacheName: CACHE });
  return cached ?? new Response("Studio sedang offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Hanya navigasi Studio (scope) yang ditangani; respons tidak pernah disimpan.
    if (url.pathname !== "/studio" && !url.pathname.startsWith("/studio/")) return;
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          const response = preloaded ?? (await fetch(request));
          // Hanya navigasi Studio yang benar-benar terbuka (bukan redirect ke /masuk setelah logout) yang boleh
          // mengisi ulang cache, supaya "logout menghapus cache" tetap berlaku.
          if (response.ok && !response.redirected && response.type !== "opaqueredirect") event.waitUntil(ensurePrecache());
          return response;
        } catch {
          return offlineResponse();
        }
      })(),
    );
    return;
  }

  if (PRECACHE.includes(url.pathname) && url.search === "") {
    event.respondWith(caches.match(url.pathname, { cacheName: CACHE }).then((cached) => cached ?? fetch(request)));
  }
});

// Logout / login: halaman meminta cache dihapus (antrean ide di IndexedDB tidak disentuh).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-cache") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("studio-")).map((k) => caches.delete(k)))));
  }
});
