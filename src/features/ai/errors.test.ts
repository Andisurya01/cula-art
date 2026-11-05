import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { AI_MESSAGES, aiErrorMessage } from "./errors";

/** Error HTTP seperti yang dibuat SDK dari respons API (subkelas dipilih dari status). */
const http = (status: number) =>
  Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message: "detail" } }, "detail", new Headers());

describe("aiErrorMessage", () => {
  it("memetakan kelas error SDK ke pesan Indonesia", () => {
    expect(aiErrorMessage(http(401))).toMatch(/Kunci API Anthropic ditolak/);
    expect(aiErrorMessage(http(429))).toMatch(/Batas permintaan/);
    expect(aiErrorMessage(http(529))).toMatch(/sibuk/);
    expect(aiErrorMessage(http(404))).toMatch(/Model AI/);
    expect(aiErrorMessage(http(400))).toMatch(/^Permintaan ke AI ditolak:/);
    expect(aiErrorMessage(new Anthropic.APIConnectionError({ message: "x" }))).toMatch(/Gagal terhubung/);
    expect(aiErrorMessage(new Anthropic.APIConnectionTimeoutError())).toMatch(/terlalu lama/);
    expect(aiErrorMessage(new Anthropic.APIUserAbortError())).toBe(AI_MESSAGES.aborted);
    expect(aiErrorMessage(new Error("apa saja"))).toMatch(/Terjadi kesalahan/);
  });
});
