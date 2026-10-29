// Penyaji file unggahan (publik): /media/<key>. Key acak dan tidak pernah berubah, jadi boleh
// di-cache selamanya. Key yang tidak cocok pola (termasuk ../) langsung 404.

import { contentTypeForKey, isValidStorageKey, readStoredFile } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isValidStorageKey(key)) return notFound();

  const file = await readStoredFile(key);
  if (!file) return notFound();

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}

function notFound() {
  return new Response("Tidak ditemukan", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
