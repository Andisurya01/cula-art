// Integrasi ke database test: Route Handler ekspor `GET /studio/ekspor/[file]` (E11).
// Isi CSV dari data uji, header unduhan, JSON tanpa tabel/nilai auth, dan file tak dikenal 404.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/studio/ekspor/[file]/route";
import { requireAdmin } from "@/features/auth/dal";
import { wibToUtc } from "@/lib/date";
import { db, resetDatabase } from "@/test/db";
import { EXPORT_FILES } from "./files";
import { AUTH_TABLES, EXPORT_TABLES } from "./json";
import { csvHeader, csvRecords } from "./test-helpers";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const SECRET = {
  email: "pemilik-rahasia@contoh.id",
  passwordHash: "scrypt$16384$8$1$SEEDSALT0123$SEEDPASSWORDHASH0123456789",
  totpSecret: "JBSWY3DPEHPK3PXPSEEDTOTP",
  recoveryHash: "recoveryhash0f9e8d7c6b5a4seed",
  sessionTokenHash: "sessiontokenhash1a2b3c4d5e6fseed",
  challengeTokenHash: "challengetokenhash9z8y7x6wseed",
  pendingTotpSecret: "PENDINGTOTPSECRETSEED",
  userAgent: "AgenRahasia/1.0",
  ip: "203.0.113.77",
};

async function seed() {
  const admin = await db.adminUser.create({
    data: {
      email: SECRET.email,
      passwordHash: SECRET.passwordHash,
      totpSecret: SECRET.totpSecret,
      recoveryCodeHashes: [SECRET.recoveryHash],
    },
  });
  const expiresAt = new Date(Date.now() + 86_400_000);
  await db.session.create({
    data: {
      tokenHash: SECRET.sessionTokenHash,
      adminUserId: admin.id,
      expiresAt,
      userAgent: SECRET.userAgent,
      ip: SECRET.ip,
    },
  });
  await db.loginChallenge.create({
    data: {
      tokenHash: SECRET.challengeTokenHash,
      adminUserId: admin.id,
      kind: "SETUP",
      pendingTotpSecret: SECRET.pendingTotpSecret,
      expiresAt,
    },
  });
  await db.loginAttempt.create({ data: { key: `email:${SECRET.email}`, success: false } });

  await db.setting.create({ data: { id: "default", contactEmail: "kontak@galeri.test" } });
  await db.aiGuide.create({ data: { id: "default" } });
  const pillar = await db.pillar.create({ data: { name: "Proses Clay", color: "#c2410c" } });
  const format = await db.format.create({ data: { name: "Time-lapse" } });
  const hookType = await db.hookType.create({ data: { name: "Hasil di depan" } });
  const project = await db.project.create({ data: { title: "Naga", medium: "CLAY" } });
  const idea = await db.idea.create({
    data: {
      title: '=HYPERLINK("http://jahat","klik"); naga',
      notes: "baris 1\nbaris 2",
      status: "PICKED",
      medium: "CLAY",
      potential: 5,
      pillarId: pillar.id,
      createdAt: new Date("2026-11-07T17:10:00Z"),
    },
  });
  const content = await db.content.create({
    data: {
      title: "Reveal naga",
      ideaId: idea.id,
      projectId: project.id,
      seriesPart: 2,
      pillarId: pillar.id,
      formatId: format.id,
      hookTypeId: hookType.id,
      hookText: "Dari segumpal clay",
      stage: "POSTED",
      checklist: { create: [{ label: "Rekam", done: true }, { label: "Edit", done: false }] },
    },
  });
  const tiktok = await db.post.create({
    data: {
      contentId: content.id,
      platform: "TIKTOK",
      postType: "VIDEO",
      postedAt: new Date("2026-11-01T12:05:00Z"),
      url: "https://www.tiktok.com/@a/video/1",
      caption: "Naga; part 2",
    },
  });
  const instagram = await db.post.create({
    data: {
      contentId: content.id,
      platform: "INSTAGRAM",
      postType: "REEL",
      postedAt: new Date("2026-11-01T16:59:00Z"),
      url: "https://www.instagram.com/reel/1",
    },
  });
  const metrics = { likes: 10, comments: 2, shares: 1, saves: 3, follows: 1 };
  await db.metricSnapshot.createMany({
    data: [
      { postId: tiktok.id, kind: "H1", views: 1200, recordedAt: new Date("2026-11-02T13:00:00Z"), ...metrics },
      { postId: tiktok.id, kind: "H7", views: 5000, avgWatchSec: 12.5, completionRate: 33.3, ...metrics },
      { postId: tiktok.id, kind: "CUSTOM", views: 9999, ...metrics },
      { postId: instagram.id, kind: "H1", views: 800, ...metrics },
    ],
  });
  await db.accountSnapshot.createMany({
    data: [
      { platform: "TIKTOK", date: wibToUtc("2026-11-01"), followers: 1200 },
      { platform: "INSTAGRAM", date: wibToUtc("2026-11-01"), followers: 500 },
      { platform: "TIKTOK", date: wibToUtc("2026-11-08"), followers: 1500 },
      { platform: "INSTAGRAM", date: wibToUtc("2026-11-08"), followers: 480 },
    ],
  });
  const artwork = await db.artwork.create({
    data: {
      slug: "naga-merah",
      title: "Naga Merah",
      medium: "CLAY",
      year: 2026,
      widthCm: 30.5,
      projectId: project.id,
      images: {
        create: [
          { storageKey: "artworks/sampul-naga.webp", width: 800, height: 600, isCover: true },
          { storageKey: "artworks/proses-naga.webp", width: 800, height: 600, isProcess: true },
        ],
      },
      contents: { create: [{ contentId: content.id }] },
    },
  });
  await db.artworkSlugRedirect.create({ data: { oldSlug: "naga-lama", artworkId: artwork.id } });
  const experiment = await db.experiment.create({
    data: {
      hypothesis: "Hook hasil di depan lebih baik",
      platform: "TIKTOK",
      variable: "HOOK",
      variantA: "Proses dulu",
      variantB: "Hasil dulu",
      decidingMetric: "SCORE",
    },
  });
  await db.experimentPost.create({ data: { experimentId: experiment.id, postId: tiktok.id, variant: "B" } });
  await db.weeklyReview.create({ data: { weekStart: wibToUtc("2026-11-02"), wins: "Naga laku" } });
  await db.suggestionDismissal.create({ data: { key: "low-ideas:-:ide", until: new Date(Date.now() + 86_400_000) } });
  await db.aiRun.create({ data: { feature: "hook", model: "mock", promptVersion: "hook@1", inputTokens: 120 } });
}

async function download(file: string) {
  const res = await GET(new Request(`http://localhost/studio/ekspor/${encodeURIComponent(file)}`), {
    params: Promise.resolve({ file }),
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  // ignoreBOM: true = BOM tetap ada di teks (Response.text() membuangnya).
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  return { res, bytes, text };
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  await seed();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /studio/ekspor/[file]", () => {
  it("requireAdmin() dipanggil dulu; tanpa sesi tidak ada isi yang dikirim", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(download("data.json")).rejects.toThrow("NEXT_REDIRECT");

    await download("ide.csv");
    expect(requireAdmin).toHaveBeenCalledTimes(2);
  });

  it("header unduhan: lampiran bertanggal WIB, no-store, nosniff", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T17:30:00Z")); // 8 Nov 00.30 WIB
    for (const entry of EXPORT_FILES) {
      const { res } = await download(entry.file);
      expect(res.status, entry.file).toBe(200);
      const ext = entry.file.endsWith(".json") ? "json" : "csv";
      expect(res.headers.get("content-disposition")).toBe(
        `attachment; filename="studio-${entry.base}-2026-11-08.${ext}"`,
      );
      expect(res.headers.get("content-type")).toBe(
        ext === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      );
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("CSV: BOM, pemisah ;, CRLF, kutip, dan perlindungan formula pada ide", async () => {
    const { bytes, text } = await download("ide.csv");
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(text.split("\r\n")[0]).toMatch(/^﻿ID;Judul;Status;/);
    const [row] = csvRecords(text);
    expect(row).toMatchObject({
      Judul: `'=HYPERLINK("http://jahat","klik"); naga`,
      Catatan: "baris 1\nbaris 2",
      Status: "Dipilih",
      Pilar: "Proses Clay",
      Medium: "Clay",
      "Potensi (1-5)": "5",
      "Dibuat (WIB)": "2026-11-08 00:10",
    });
    expect(row!["ID konten"]).not.toBe("");
    expect(text).toContain(`"'=HYPERLINK(""http://jahat"",""klik""); naga"`);
  });

  it("konten.csv: pilar, format, hook, proyek, part, tahap", async () => {
    const [row] = csvRecords((await download("konten.csv")).text);
    expect(row).toMatchObject({
      Judul: "Reveal naga",
      Tahap: "Posted",
      Pilar: "Proses Clay",
      Format: "Time-lapse",
      "Tipe hook": "Hasil di depan",
      Hook: "Dari segumpal clay",
      Proyek: "Naga",
      Part: "2",
      "Platform (post)": "TikTok, Instagram",
      "Checklist selesai": "1",
      "Checklist total": "2",
    });
  });

  it("post.csv: satu baris per post, H+1/H+7, views TikTok dan reach Instagram terpisah", async () => {
    const { text } = await download("post.csv");
    expect(csvHeader(text).filter((h) => /total/i.test(h))).toEqual([]);
    const rows = csvRecords(text);
    expect(rows).toHaveLength(2);
    const [tt, ig] = rows;
    expect(tt).toMatchObject({
      Platform: "TikTok",
      "Tayang (WIB)": "2026-11-01 19:05",
      Caption: "Naga; part 2",
      "H+1 Views TikTok": "1200",
      "H+1 Reach Instagram": "",
      "H+7 Views TikTok": "5000",
      "H+7 Rata-rata tonton (detik)": "12,5",
      "H+7 Completion rate (%)": "33,3",
      "H+1 dicatat (WIB)": "2026-11-02 20:00",
    });
    expect(ig).toMatchObject({
      Platform: "Instagram",
      "Tayang (WIB)": "2026-11-01 23:59",
      "H+1 Views TikTok": "",
      "H+1 Reach Instagram": "800",
      "H+7 Reach Instagram": "",
    });
    expect(text).not.toContain("9999"); // snapshot CUSTOM tidak ikut CSV
  });

  it("followers.csv: tanggal WIB saja dan perubahan per platform", async () => {
    const rows = csvRecords((await download("followers.csv")).text);
    expect(rows.map((r) => [r["Tanggal (WIB)"], r.Platform, r.Followers, r["Perubahan dari snapshot sebelumnya"]])).toEqual([
      ["2026-11-01", "TikTok", "1200", ""],
      ["2026-11-01", "Instagram", "500", ""],
      ["2026-11-08", "TikTok", "1500", "300"],
      ["2026-11-08", "Instagram", "480", "-20"],
    ]);
  });

  it("karya.csv: jumlah foto dan storageKey cover, tanpa isi file", async () => {
    const [row] = csvRecords((await download("karya.csv")).text);
    expect(row).toMatchObject({
      Slug: "naga-merah",
      "Lebar (cm)": "30,5",
      "Foto karya (jumlah)": "1",
      "Foto proses (jumlah)": "1",
      "Cover (storageKey)": "artworks/sampul-naga.webp",
      "Konten terkait (jumlah)": "1",
      Proyek: "Naga",
    });
  });

  it("data.json: semua tabel data, metadata, tanpa tabel dan nilai auth", async () => {
    const { res, text } = await download("data.json");
    expect(res.status).toBe(200);
    const parsed = JSON.parse(text) as {
      format: string;
      version: number;
      exportedAt: string;
      exportedAtWib: string;
      counts: Record<string, number>;
      tables: Record<string, Record<string, unknown>[]>;
    };
    expect(parsed.version).toBe(1);
    expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt);
    expect(parsed.exportedAtWib).toMatch(/\+07:00$/);
    expect(Object.keys(parsed.tables)).toEqual([...EXPORT_TABLES]);

    const keys = Object.keys(parsed.tables).map((k) => k.toLowerCase());
    for (const table of AUTH_TABLES) expect(keys).not.toContain(table.toLowerCase());
    for (const forbidden of [
      "passwordHash",
      "tokenHash",
      "totpSecret",
      "pendingTotpSecret",
      "recoveryCodeHashes",
      "AdminUser",
      "LoginChallenge",
      "LoginAttempt",
      ...Object.values(SECRET),
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }

    expect(parsed.counts).toMatchObject({
      Post: 2,
      MetricSnapshot: 4,
      AccountSnapshot: 4,
      ArtworkImage: 2,
      ExperimentPost: 1,
      WeeklyReview: 1,
      SuggestionDismissal: 1,
      AiRun: 1,
      Setting: 1,
      AiGuide: 1,
      ArtworkSlugRedirect: 1,
    });
    for (const table of EXPORT_TABLES) expect(parsed.counts[table]).toBe(parsed.tables[table]!.length);
    expect(parsed.tables.ArtworkImage!.map((image) => image.storageKey).sort()).toEqual([
      "artworks/proses-naga.webp",
      "artworks/sampul-naga.webp",
    ]);
    expect(parsed.tables.Idea![0]!.createdAt).toBe("2026-11-07T17:10:00.000Z");
  });

  it.each(["rahasia.csv", "IDE.CSV", "ide", "data.json.bak", "../data.json", "admin.json", "Session.csv"])(
    "file tak dikenal %j → 404 (tetap lewat requireAdmin)",
    async (file) => {
      const { res, text } = await download(file);
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("content-disposition")).toBeNull();
      expect(text).toBe("Tidak ditemukan");
      expect(requireAdmin).toHaveBeenCalledTimes(1);
    },
  );
});
