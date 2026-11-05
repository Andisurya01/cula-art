// Asisten AI (POST JSON → respons NDJSON bertahap). Lewat Route Handler, bukan Server Action, karena hasil
// panjang dialirkan sedikit demi sedikit (event `partial`, lalu `done` atau `error`). Hasil hanya draf untuk
// form; route ini tidak menyimpan apa pun selain log AiRun. Body kecil, jadi tetap lewat proxy.

import { isCrossSiteRequest } from "@/lib/upload-route";
import { requireAdmin } from "@/features/auth/dal";
import { runAiRequest } from "@/features/ai/run";
import { AI_REQUEST_MAX_BYTES, AI_STREAM_CONTENT_TYPE, type AiStreamEvent } from "@/features/ai/stream-protocol";

export async function POST(request: Request) {
  await requireAdmin();
  if (isCrossSiteRequest(request)) return errorResponse("Permintaan dari situs lain ditolak.", 403);
  if (Number(request.headers.get("content-length") ?? 0) > AI_REQUEST_MAX_BYTES) {
    return errorResponse("Permintaan terlalu besar.", 413);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > AI_REQUEST_MAX_BYTES) return errorResponse("Permintaan terlalu besar.", 413);
    body = JSON.parse(text);
  } catch {
    return errorResponse("Permintaan tidak valid.", 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AiStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Klien sudah menutup koneksi; panggilan ke Claude ikut dibatalkan lewat request.signal.
        }
      };
      try {
        await runAiRequest(body, { signal: request.signal, emit });
      } catch (error) {
        console.error("[ai] route gagal:", error);
        emit({ type: "error", message: "Terjadi kesalahan di server. Coba lagi." });
      } finally {
        try {
          controller.close();
        } catch {
          // sudah ditutup
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": AI_STREAM_CONTENT_TYPE,
      // no-transform: kompresi (Next/Caddy) tidak menahan potongan hasil sampai buffer penuh.
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorResponse(message: string, status: number): Response {
  const event: AiStreamEvent = { type: "error", message };
  return new Response(`${JSON.stringify(event)}\n`, {
    status,
    headers: { "Content-Type": AI_STREAM_CONTENT_TYPE, "Cache-Control": "no-store" },
  });
}
