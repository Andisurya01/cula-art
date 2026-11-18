import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  AUTH_TABLES,
  buildJsonExport,
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  EXPORT_TABLES,
  jsonExportText,
  type ExportTables,
} from "./json";

const emptyTables = () =>
  Object.fromEntries(EXPORT_TABLES.map((table) => [table, []])) as unknown as ExportTables;

describe("allowlist tabel JSON", () => {
  const models = Prisma.dmmf.datamodel.models.map((model) => model.name);

  it("setiap model Prisma diekspor atau tercatat sebagai tabel auth (tabel baru tidak terlewat)", () => {
    const decided = new Set<string>([...EXPORT_TABLES, ...AUTH_TABLES]);
    expect(models.filter((name) => !decided.has(name))).toEqual([]);
  });

  it("tidak ada nama yang bukan model, ganda, atau di kedua daftar", () => {
    expect([...EXPORT_TABLES, ...AUTH_TABLES].filter((name) => !models.includes(name))).toEqual([]);
    expect(new Set(EXPORT_TABLES).size).toBe(EXPORT_TABLES.length);
    expect(EXPORT_TABLES.filter((name) => (AUTH_TABLES as readonly string[]).includes(name))).toEqual([]);
  });

  it("tabel auth tepat empat tabel login", () => {
    expect([...AUTH_TABLES].sort()).toEqual(["AdminUser", "LoginAttempt", "LoginChallenge", "Session"]);
  });

  it("tabel yang diekspor tidak punya kolom rahasia auth", () => {
    // (AiRun.inputTokens dst. adalah jumlah token AI, bukan token sesi.)
    const secret = /password|totp|tokenHash|recoveryCode|secret/i;
    const leaks = Prisma.dmmf.datamodel.models
      .filter((model) => (EXPORT_TABLES as readonly string[]).includes(model.name))
      .flatMap((model) => model.fields.filter((field) => secret.test(field.name)).map((f) => `${model.name}.${f.name}`));
    expect(leaks).toEqual([]);
  });
});

describe("buildJsonExport", () => {
  const now = new Date("2026-11-07T17:30:00Z");

  it("metadata: format, versi, waktu UTC + WIB, catatan", () => {
    const out = buildJsonExport(emptyTables(), now);
    expect(out.format).toBe(EXPORT_FORMAT);
    expect(out.version).toBe(EXPORT_FORMAT_VERSION);
    expect(out.exportedAt).toBe("2026-11-07T17:30:00.000Z");
    expect(out.exportedAtWib).toBe("2026-11-08T00:30:00+07:00");
    expect(out.timezone).toBe("Asia/Jakarta");
    expect(out.notes.join(" ")).toMatch(/UTC/);
  });

  it("data kosong → semua tabel ada dengan 0 baris", () => {
    const out = buildJsonExport(emptyTables(), now);
    expect(Object.keys(out.tables)).toEqual([...EXPORT_TABLES]);
    expect(Object.values(out.counts).every((count) => count === 0)).toBe(true);
  });

  it("hanya tabel allowlist yang ditulis, walau input membawa kunci lain", () => {
    const tables = {
      ...emptyTables(),
      Pillar: [{ id: "p1", name: "Proses" }],
      AdminUser: [{ id: "u", passwordHash: "scrypt$rahasia" }],
    } as unknown as ExportTables;
    const text = jsonExportText(tables, now);
    const parsed = JSON.parse(text) as { tables: Record<string, unknown[]>; counts: Record<string, number> };
    expect(Object.keys(parsed.tables)).not.toContain("AdminUser");
    expect(parsed.counts.Pillar).toBe(1);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("scrypt$rahasia");
    expect(text.endsWith("}\n")).toBe(true);
  });

  it("Date ditulis sebagai ISO UTC", () => {
    const tables = { ...emptyTables(), Idea: [{ id: "i", createdAt: new Date("2026-11-08T01:02:03Z") }] };
    const parsed = JSON.parse(jsonExportText(tables, now)) as { tables: { Idea: { createdAt: string }[] } };
    expect(parsed.tables.Idea[0]!.createdAt).toBe("2026-11-08T01:02:03.000Z");
  });
});
