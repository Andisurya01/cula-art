import { describe, expect, it } from "vitest";
import {
  artworksCsv,
  contentsCsv,
  followersCsv,
  ideasCsv,
  postsCsv,
  type ArtworkExportRow,
  type ContentExportRow,
  type FollowerExportRow,
  type IdeaExportRow,
  type PostExportRow,
  type PostSnapshotExport,
} from "./sheets";
import { csvHeader, csvRecords } from "./test-helpers";

const T = (iso: string) => new Date(iso);

describe("data kosong", () => {
  it.each([
    ["ide", ideasCsv],
    ["konten", contentsCsv],
    ["post", postsCsv],
    ["followers", followersCsv],
    ["karya", artworksCsv],
  ] as const)("%s: hanya header", (_name, build) => {
    const text = (build as (rows: readonly never[]) => string)([]);
    expect(text.startsWith("﻿")).toBe(true);
    expect(csvRecords(text)).toEqual([]);
    expect(csvHeader(text).length).toBeGreaterThan(3);
  });
});

describe("ideasCsv", () => {
  const idea: IdeaExportRow = {
    id: "i1",
    title: 'Naga; "merah"',
    notes: "baris 1\nbaris 2",
    medium: "CLAY",
    potential: 4,
    effort: null,
    status: "NEW",
    refUrl: "https://contoh.id/a?b=1",
    createdAt: T("2026-11-07T17:10:00Z"),
    updatedAt: T("2026-11-08T07:00:00Z"),
    pillar: { name: "Proses Clay" },
    content: null,
  };

  it("label Indonesia, waktu WIB, kosong untuk null", () => {
    const [row] = csvRecords(ideasCsv([idea]));
    expect(row).toMatchObject({
      ID: "i1",
      Judul: 'Naga; "merah"',
      Catatan: "baris 1\nbaris 2",
      Status: "Baru",
      Pilar: "Proses Clay",
      Medium: "Clay",
      "Potensi (1-5)": "4",
      "Usaha (1-5)": "",
      "ID konten": "",
      "Dibuat (WIB)": "2026-11-08 00:10",
      "Diubah (WIB)": "2026-11-08 14:00",
    });
  });

  it("judul berbentuk formula diberi awalan '", () => {
    const [row] = csvRecords(ideasCsv([{ ...idea, title: "=IMPORTXML(1)", pillar: null, medium: null }]));
    expect(row!.Judul).toBe("'=IMPORTXML(1)");
    expect(row!.Pilar).toBe("");
    expect(row!.Medium).toBe("");
  });
});

describe("contentsCsv", () => {
  const content: ContentExportRow = {
    id: "c1",
    title: "Reveal naga",
    stage: "EDITING",
    stageChangedAt: T("2026-11-01T12:00:00Z"),
    seriesPart: 2,
    hookText: "Dari segumpal clay…",
    script: null,
    shotList: null,
    targetDurationSec: 45,
    ideaId: "i1",
    createdAt: T("2026-10-01T00:00:00Z"),
    updatedAt: T("2026-11-01T12:00:00Z"),
    pillar: { name: "Proses Clay" },
    format: { name: "Time-lapse" },
    hookType: null,
    project: { title: "Naga" },
    posts: [{ platform: "INSTAGRAM" }, { platform: "TIKTOK" }],
    checklist: [{ done: true }, { done: false }, { done: true }],
  };

  it("pilar, format, hook, proyek, part, stage, checklist sebagai angka", () => {
    const [row] = csvRecords(contentsCsv([content]));
    expect(row).toMatchObject({
      Tahap: "Editing",
      "Di tahap ini sejak (WIB)": "2026-11-01 19:00",
      Pilar: "Proses Clay",
      Format: "Time-lapse",
      "Tipe hook": "",
      Hook: "Dari segumpal clay…",
      Proyek: "Naga",
      Part: "2",
      "Target durasi (detik)": "45",
      "Platform (post)": "TikTok, Instagram",
      "Checklist selesai": "2",
      "Checklist total": "3",
      "ID ide": "i1",
    });
  });
});

describe("postsCsv", () => {
  const snapshot = (kind: "H1" | "H7", views: number, extra: Partial<PostSnapshotExport> = {}): PostSnapshotExport => ({
    kind,
    source: "MANUAL",
    recordedAt: T("2026-11-02T13:00:00Z"),
    views,
    likes: 10,
    comments: 2,
    shares: 1,
    saves: 3,
    follows: 0,
    avgWatchSec: null,
    completionRate: null,
    ...extra,
  });
  const base: Omit<PostExportRow, "id" | "platform" | "snapshots"> = {
    contentId: "c1",
    postType: "VIDEO",
    scheduledAt: T("2026-11-01T11:00:00Z"),
    postedAt: T("2026-11-01T12:05:00Z"),
    url: "https://tiktok.com/@a/video/1",
    durationSec: 30,
    caption: "@teman lihat ini",
    hashtags: "#clay #naga",
    externalId: null,
    content: { title: "Reveal naga", pillar: { name: "Proses Clay" }, format: null, hookType: { name: "Hasil di depan" } },
  };
  const tiktok: PostExportRow = {
    ...base,
    id: "p1",
    platform: "TIKTOK",
    snapshots: [snapshot("H7", 5000, { avgWatchSec: 12.5, completionRate: 33.3 }), snapshot("H1", 1200)],
  };
  const instagram: PostExportRow = {
    ...base,
    id: "p2",
    platform: "INSTAGRAM",
    postType: "REEL",
    snapshots: [snapshot("H1", 0)],
  };

  it("satu baris per post; views TikTok dan reach Instagram di kolom sendiri", () => {
    const text = postsCsv([tiktok, instagram]);
    const header = csvHeader(text);
    expect(header).toContain("H+1 Views TikTok");
    expect(header).toContain("H+1 Reach Instagram");
    expect(header).toContain("H+7 Views TikTok");
    expect(header).toContain("H+7 Reach Instagram");
    expect(header).not.toContain("H+1 Views");
    expect(header.filter((h) => /total/i.test(h))).toEqual([]);

    const [tt, ig] = csvRecords(text);
    expect(tt).toMatchObject({
      "ID post": "p1",
      Platform: "TikTok",
      "Tipe post": "Video",
      "Tayang (WIB)": "2026-11-01 19:05",
      "Dijadwalkan (WIB)": "2026-11-01 18:00",
      Caption: "'@teman lihat ini",
      "H+1 Views TikTok": "1200",
      "H+1 Reach Instagram": "",
      "H+7 Views TikTok": "5000",
      "H+7 Reach Instagram": "",
      "H+7 Rata-rata tonton (detik)": "12,5",
      "H+7 Completion rate (%)": "33,3",
      "H+1 dicatat (WIB)": "2026-11-02 20:00",
      "H+1 sumber": "Manual",
      "Tipe hook": "Hasil di depan",
    });
    expect(ig).toMatchObject({
      Platform: "Instagram",
      "H+1 Views TikTok": "",
      "H+1 Reach Instagram": "0",
      "H+7 Reach Instagram": "",
      "H+7 Likes": "",
      "H+7 dicatat (WIB)": "",
    });
  });

  it("post belum tayang dan tanpa snapshot → kolom metrik kosong", () => {
    const [row] = csvRecords(postsCsv([{ ...tiktok, postedAt: null, scheduledAt: null, snapshots: [] }]));
    expect(row!["Tayang (WIB)"]).toBe("");
    expect(row!["H+1 Likes"]).toBe("");
    expect(row!["H+1 Views TikTok"]).toBe("");
  });
});

describe("followersCsv", () => {
  const snap = (platform: "TIKTOK" | "INSTAGRAM", date: string, followers: number): FollowerExportRow => ({
    platform,
    date: T(date),
    followers,
    source: "MANUAL",
  });

  it("tanggal WIB, urut tanggal lalu platform, perubahan per platform (negatif tetap angka)", () => {
    const rows = csvRecords(
      followersCsv([
        snap("INSTAGRAM", "2026-11-07T17:00:00Z", 480),
        snap("TIKTOK", "2026-11-07T17:00:00Z", 1500),
        snap("INSTAGRAM", "2026-10-31T17:00:00Z", 500),
        snap("TIKTOK", "2026-10-31T17:00:00Z", 1200),
      ]),
    );
    expect(rows.map((r) => [r["Tanggal (WIB)"], r.Platform, r.Followers, r["Perubahan dari snapshot sebelumnya"]])).toEqual([
      ["2026-11-01", "TikTok", "1200", ""],
      ["2026-11-01", "Instagram", "500", ""],
      ["2026-11-08", "TikTok", "1500", "300"],
      ["2026-11-08", "Instagram", "480", "-20"],
    ]);
  });
});

describe("artworksCsv", () => {
  const artwork: ArtworkExportRow = {
    id: "a1",
    slug: "naga-merah",
    title: "Naga Merah",
    summary: null,
    description: "Patung clay\nbercat akrilik",
    medium: "CLAY",
    year: 2026,
    widthCm: 30.5,
    heightCm: 42,
    depthCm: null,
    materials: "Clay; akrilik",
    weightGram: 850,
    visibility: "PUBLISHED",
    availability: "AVAILABLE",
    priceIdr: 1_500_000,
    showPrice: false,
    isFeatured: true,
    featuredOrder: 1,
    publishedAt: T("2026-11-07T17:30:00Z"),
    createdAt: T("2026-10-01T00:00:00Z"),
    updatedAt: T("2026-11-07T17:30:00Z"),
    project: { title: "Naga" },
    images: [
      { storageKey: "artworks/aa.webp", isCover: false, isProcess: false },
      { storageKey: "artworks/bb.webp", isCover: true, isProcess: false },
      { storageKey: "artworks/cc.webp", isCover: false, isProcess: true },
    ],
    contents: [{ contentId: "c1" }],
  };

  it("jumlah foto, storageKey cover, desimal koma, Ya/Tidak", () => {
    const [row] = csvRecords(artworksCsv([artwork]));
    expect(row).toMatchObject({
      Visibilitas: "Terbit",
      Ketersediaan: "Tersedia",
      "Harga (Rp)": "1500000",
      "Tampilkan harga": "Tidak",
      Unggulan: "Ya",
      Medium: "Clay",
      "Lebar (cm)": "30,5",
      "Tinggi (cm)": "42",
      "Kedalaman (cm)": "",
      Bahan: "Clay; akrilik",
      Deskripsi: "Patung clay\nbercat akrilik",
      "Foto karya (jumlah)": "2",
      "Foto proses (jumlah)": "1",
      "Cover (storageKey)": "artworks/bb.webp",
      "Konten terkait (jumlah)": "1",
      "Terbit (WIB)": "2026-11-08 00:30",
    });
  });

  it("tanpa foto → 0 dan cover kosong", () => {
    const [row] = csvRecords(artworksCsv([{ ...artwork, images: [], contents: [] }]));
    expect(row!["Foto karya (jumlah)"]).toBe("0");
    expect(row!["Cover (storageKey)"]).toBe("");
  });
});
