import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import {
  CSV_EXPORT_FILES,
  EXPORT_FILES,
  exportContentType,
  exportFileName,
  isExportFile,
  JSON_EXPORT_FILE,
} from "./files";

describe("isExportFile", () => {
  it("menerima tepat enam file yang disepakati", () => {
    expect(EXPORT_FILES.map((entry) => entry.file)).toEqual([
      "ide.csv",
      "konten.csv",
      "post.csv",
      "followers.csv",
      "karya.csv",
      "data.json",
    ]);
    for (const entry of EXPORT_FILES) expect(isExportFile(entry.file)).toBe(true);
  });

  it.each(["", "IDE.CSV", "ide", "ide.csv ", "../data.json", "data.json.bak", "admin.csv", "constructor", "__proto__"])(
    "menolak %j",
    (value) => {
      expect(isExportFile(value)).toBe(false);
    },
  );

  it("CSV dan JSON terpisah untuk tab Pengaturan", () => {
    expect(CSV_EXPORT_FILES).toHaveLength(5);
    expect(JSON_EXPORT_FILE.file).toBe("data.json");
  });

  it("route ekspor tanpa encoding aneh", () => {
    expect(routes.studio.exportFile("ide.csv")).toBe("/studio/ekspor/ide.csv");
  });
});

describe("exportFileName", () => {
  it("bertanggal WIB, termasuk dekat tengah malam", () => {
    expect(exportFileName("ide.csv", new Date("2026-11-08T07:00:00Z"))).toBe("studio-ide-2026-11-08.csv");
    expect(exportFileName("post.csv", new Date("2026-11-07T16:59:00Z"))).toBe("studio-post-2026-11-07.csv");
    expect(exportFileName("post.csv", new Date("2026-11-07T17:00:00Z"))).toBe("studio-post-2026-11-08.csv");
    expect(exportFileName("data.json", new Date("2026-12-31T17:30:00Z"))).toBe("studio-data-2027-01-01.json");
  });

  it("nama file hanya ASCII aman untuk Content-Disposition", () => {
    for (const entry of EXPORT_FILES) {
      expect(exportFileName(entry.file, new Date())).toMatch(/^studio-[a-z]+-\d{4}-\d{2}-\d{2}\.(csv|json)$/);
    }
  });
});

describe("exportContentType", () => {
  it("CSV dan JSON ber-charset UTF-8", () => {
    expect(exportContentType("ide.csv")).toBe("text/csv; charset=utf-8");
    expect(exportContentType("data.json")).toBe("application/json; charset=utf-8");
  });
});
