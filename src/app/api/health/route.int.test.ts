import { describe, expect, it, vi } from "vitest";
import { db } from "@/test/db";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("200 + no-store jika database siap", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, database: "ok" });
  });

  it("503 tanpa detail error jika database gagal", async () => {
    const spy = vi.spyOn(db, "$queryRaw").mockRejectedValueOnce(new Error("password salah untuk user galeri"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await GET();
    expect(res.status).toBe(503);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("password");
    spy.mockRestore();
    log.mockRestore();
  });
});
