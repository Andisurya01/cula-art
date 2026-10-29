import { describe, expect, it } from "vitest";
import { isCrossSiteRequest, receiveImageUpload } from "./upload-route";

const req = (headers: Record<string, string>) =>
  new Request("http://localhost/studio/karya/x/foto", { method: "POST", headers });

describe("isCrossSiteRequest", () => {
  it("same-origin dari browser diterima", () => {
    expect(isCrossSiteRequest(req({ "sec-fetch-site": "same-origin", origin: "https://galeri.id", host: "galeri.id" }))).toBe(false);
    expect(isCrossSiteRequest(req({ origin: "http://localhost:3100", host: "localhost:3100" }))).toBe(false);
  });

  it("tanpa header browser (skrip/test) dibiarkan; requireAdmin tetap menjaga", () => {
    expect(isCrossSiteRequest(req({}))).toBe(false);
  });

  it("lintas situs atau subdomain se-situs ditolak", () => {
    expect(isCrossSiteRequest(req({ "sec-fetch-site": "same-site", origin: "https://evil.galeri.id", host: "galeri.id" }))).toBe(true);
    expect(isCrossSiteRequest(req({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSiteRequest(req({ origin: "https://evil.example", host: "galeri.id" }))).toBe(true);
    expect(isCrossSiteRequest(req({ origin: "null", host: "galeri.id" }))).toBe(true);
  });

  it("receiveImageUpload membalas 403 sebelum membaca file", async () => {
    const res = await receiveImageUpload(req({ "sec-fetch-site": "cross-site" }));
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(403);
  });
});
