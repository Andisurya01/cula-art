import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  needsUpload,
  summarizeQueue,
  uploadResultMessage,
  type QueueEntry,
} from "./upload-queue";

describe("needsUpload / summarizeQueue", () => {
  const entries: QueueEntry[] = [
    { status: "pending" },
    { status: "uploading" },
    { status: "done" },
    { status: "done" },
    { status: "error", error: "Format tidak didukung." },
  ];

  it("yang dikirim: belum dicoba dan gagal (coba lagi), bukan yang selesai/berjalan", () => {
    expect(entries.map(needsUpload)).toEqual([true, false, false, false, true]);
  });

  it("menghitung selesai, gagal, dan menunggu", () => {
    expect(summarizeQueue(entries)).toEqual({ done: 2, failed: 1, waiting: 2 });
    expect(summarizeQueue([])).toEqual({ done: 0, failed: 0, waiting: 0 });
  });
});

describe("uploadResultMessage", () => {
  it("tidak ada yang dicoba → null", () => {
    expect(uploadResultMessage({ done: 0, failed: 0 })).toBeNull();
  });

  it("semua berhasil → sukses", () => {
    expect(uploadResultMessage({ done: 1, failed: 0 })).toEqual({
      kind: "success",
      text: "Foto progres diunggah",
    });
    expect(uploadResultMessage({ done: 3, failed: 0 })?.text).toBe("3 foto progres diunggah");
  });

  it("satu file gagal → pesan server apa adanya (mis. HEIC)", () => {
    expect(uploadResultMessage({ done: 0, failed: 1 }, "Foto HEIC belum didukung.")).toEqual({
      kind: "error",
      text: "Foto HEIC belum didukung.",
    });
  });

  it("beberapa gagal / sebagian berhasil → ringkasan", () => {
    expect(uploadResultMessage({ done: 0, failed: 2 }, "x")?.text).toBe("2 foto gagal diunggah");
    expect(uploadResultMessage({ done: 2, failed: 1 }, "x")).toEqual({
      kind: "error",
      text: "2 foto diunggah, 1 gagal",
    });
  });
});

describe("formatFileSize", () => {
  it("KB di bawah 1 MB, minimal 1 KB", () => {
    expect(formatFileSize(0)).toBe("1 KB");
    expect(formatFileSize(850 * 1024)).toBe("850 KB");
  });

  it("MB dengan koma desimal Indonesia", () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2,4 MB");
    expect(formatFileSize(14.6 * 1024 * 1024)).toBe("15 MB");
  });

  it("nilai tidak valid → kosong", () => {
    expect(formatFileSize(Number.NaN)).toBe("");
    expect(formatFileSize(-1)).toBe("");
  });
});
