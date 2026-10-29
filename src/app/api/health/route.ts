// Cek hidup untuk monitoring/deploy: 200 jika aplikasi dan database siap, 503 jika database tidak
// bisa dihubungi. Tidak membocorkan detail error.

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "ok" }, { headers });
  } catch (error) {
    console.error("Health check: database tidak bisa dihubungi", error);
    return Response.json({ ok: false, database: "error" }, { status: 503, headers });
  }
}
