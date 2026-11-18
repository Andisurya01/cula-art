// Isi setiap file CSV (E11): kolom + baris dari data mentah hasil `queries.ts`. Fungsi murni.
// Aturan: waktu WIB, label Indonesia, dan tidak ada angka yang mencampur TikTok dengan Instagram
// (views TikTok dan reach Instagram di kolom terpisah, tanpa baris/kolom total).

import type {
  ArtworkVisibility,
  Availability,
  ContentStage,
  DataSource,
  IdeaStatus,
  Medium,
  Platform,
  PostType,
  SnapshotKind,
} from "@prisma/client";
import {
  ARTWORK_VISIBILITY_LABELS,
  AVAILABILITY_LABELS,
  CONTENT_STAGE_LABELS,
  IDEA_STATUS_LABELS,
  MEDIUM_LABELS,
  PLATFORM_LABELS,
  PLATFORMS,
  POST_TYPE_LABELS,
  VIEWS_LABELS,
} from "@/lib/labels";
import { buildCsv, csvDate, csvDateTime, type CsvColumn, type CsvValue } from "./csv";

const SOURCE_LABELS: Record<DataSource, string> = { MANUAL: "Manual", API: "API" };

const mediumLabel = (medium: Medium | null) => (medium ? MEDIUM_LABELS[medium] : null);

// ---- Ide ----

export interface IdeaExportRow {
  id: string;
  title: string;
  notes: string | null;
  medium: Medium | null;
  potential: number | null;
  effort: number | null;
  status: IdeaStatus;
  refUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  pillar: { name: string } | null;
  content: { id: string } | null;
}

export const IDEA_COLUMNS: readonly CsvColumn<IdeaExportRow>[] = [
  { header: "ID", value: (r) => r.id },
  { header: "Judul", value: (r) => r.title },
  { header: "Status", value: (r) => IDEA_STATUS_LABELS[r.status] },
  { header: "Pilar", value: (r) => r.pillar?.name },
  { header: "Medium", value: (r) => mediumLabel(r.medium) },
  { header: "Potensi (1-5)", value: (r) => r.potential },
  { header: "Usaha (1-5)", value: (r) => r.effort },
  { header: "Catatan", value: (r) => r.notes },
  { header: "Link referensi", value: (r) => r.refUrl },
  { header: "ID konten", value: (r) => r.content?.id },
  { header: "Dibuat (WIB)", value: (r) => csvDateTime(r.createdAt) },
  { header: "Diubah (WIB)", value: (r) => csvDateTime(r.updatedAt) },
];

export function ideasCsv(rows: readonly IdeaExportRow[]): string {
  return buildCsv(IDEA_COLUMNS, rows);
}

// ---- Konten ----

export interface ContentExportRow {
  id: string;
  title: string;
  stage: ContentStage;
  stageChangedAt: Date;
  seriesPart: number | null;
  hookText: string | null;
  script: string | null;
  shotList: string | null;
  targetDurationSec: number | null;
  ideaId: string | null;
  createdAt: Date;
  updatedAt: Date;
  pillar: { name: string };
  format: { name: string } | null;
  hookType: { name: string } | null;
  project: { title: string } | null;
  posts: { platform: Platform }[];
  checklist: { done: boolean }[];
}

export const CONTENT_COLUMNS: readonly CsvColumn<ContentExportRow>[] = [
  { header: "ID", value: (r) => r.id },
  { header: "Judul", value: (r) => r.title },
  { header: "Tahap", value: (r) => CONTENT_STAGE_LABELS[r.stage] },
  { header: "Di tahap ini sejak (WIB)", value: (r) => csvDateTime(r.stageChangedAt) },
  { header: "Pilar", value: (r) => r.pillar.name },
  { header: "Format", value: (r) => r.format?.name },
  { header: "Tipe hook", value: (r) => r.hookType?.name },
  { header: "Hook", value: (r) => r.hookText },
  { header: "Proyek", value: (r) => r.project?.title },
  { header: "Part", value: (r) => r.seriesPart },
  { header: "Target durasi (detik)", value: (r) => r.targetDurationSec },
  {
    header: "Platform (post)",
    value: (r) =>
      PLATFORMS.filter((platform) => r.posts.some((post) => post.platform === platform))
        .map((platform) => PLATFORM_LABELS[platform])
        .join(", "),
  },
  // Dua kolom angka, bukan "3/5" (Excel bisa membacanya sebagai tanggal).
  { header: "Checklist selesai", value: (r) => r.checklist.filter((item) => item.done).length },
  { header: "Checklist total", value: (r) => r.checklist.length },
  { header: "Script", value: (r) => r.script },
  { header: "Shot list", value: (r) => r.shotList },
  { header: "ID ide", value: (r) => r.ideaId },
  { header: "Dibuat (WIB)", value: (r) => csvDateTime(r.createdAt) },
  { header: "Diubah (WIB)", value: (r) => csvDateTime(r.updatedAt) },
];

export function contentsCsv(rows: readonly ContentExportRow[]): string {
  return buildCsv(CONTENT_COLUMNS, rows);
}

// ---- Post + metrik H+1/H+7 ----

export interface PostSnapshotExport {
  kind: SnapshotKind;
  source: DataSource;
  recordedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
  avgWatchSec: number | null;
  completionRate: number | null;
}

export interface PostExportRow {
  id: string;
  contentId: string;
  platform: Platform;
  postType: PostType;
  scheduledAt: Date | null;
  postedAt: Date | null;
  url: string | null;
  durationSec: number | null;
  caption: string | null;
  hashtags: string | null;
  externalId: string | null;
  content: {
    title: string;
    pillar: { name: string };
    format: { name: string } | null;
    hookType: { name: string } | null;
  };
  snapshots: PostSnapshotExport[];
}

type SnapshotKindExport = Exclude<SnapshotKind, "CUSTOM">;

const SNAPSHOT_LABELS: Record<SnapshotKindExport, string> = { H1: "H+1", H7: "H+7" };

function snapshotOf(row: PostExportRow, kind: SnapshotKindExport): PostSnapshotExport | undefined {
  return row.snapshots.find((snapshot) => snapshot.kind === kind);
}

/** Kolom satu snapshot. Views per platform punya kolom sendiri: TikTok = views, Instagram = reach. */
function snapshotColumns(kind: SnapshotKindExport): CsvColumn<PostExportRow>[] {
  const label = SNAPSHOT_LABELS[kind];
  const field =
    (pick: (snapshot: PostSnapshotExport) => CsvValue) =>
    (row: PostExportRow): CsvValue => {
      const snapshot = snapshotOf(row, kind);
      return snapshot ? pick(snapshot) : null;
    };
  return [
    { header: `${label} dicatat (WIB)`, value: field((s) => csvDateTime(s.recordedAt)) },
    ...PLATFORMS.map(
      (platform): CsvColumn<PostExportRow> => ({
        header: `${label} ${VIEWS_LABELS[platform]} ${PLATFORM_LABELS[platform]}`,
        value: (r) => (r.platform === platform ? field((s) => s.views)(r) : null),
      }),
    ),
    { header: `${label} Likes`, value: field((s) => s.likes) },
    { header: `${label} Komentar`, value: field((s) => s.comments) },
    { header: `${label} Shares`, value: field((s) => s.shares) },
    { header: `${label} Saves`, value: field((s) => s.saves) },
    { header: `${label} Follows`, value: field((s) => s.follows) },
    { header: `${label} Rata-rata tonton (detik)`, value: field((s) => s.avgWatchSec) },
    { header: `${label} Completion rate (%)`, value: field((s) => s.completionRate) },
    { header: `${label} sumber`, value: field((s) => SOURCE_LABELS[s.source]) },
  ];
}

export const POST_COLUMNS: readonly CsvColumn<PostExportRow>[] = [
  { header: "ID post", value: (r) => r.id },
  { header: "ID konten", value: (r) => r.contentId },
  { header: "Judul konten", value: (r) => r.content.title },
  { header: "Platform", value: (r) => PLATFORM_LABELS[r.platform] },
  { header: "Tipe post", value: (r) => POST_TYPE_LABELS[r.postType] },
  { header: "Pilar", value: (r) => r.content.pillar.name },
  { header: "Format", value: (r) => r.content.format?.name },
  { header: "Tipe hook", value: (r) => r.content.hookType?.name },
  { header: "Dijadwalkan (WIB)", value: (r) => csvDateTime(r.scheduledAt) },
  { header: "Tayang (WIB)", value: (r) => csvDateTime(r.postedAt) },
  { header: "URL", value: (r) => r.url },
  { header: "Durasi (detik)", value: (r) => r.durationSec },
  { header: "Caption", value: (r) => r.caption },
  { header: "Hashtags", value: (r) => r.hashtags },
  { header: "ID di platform", value: (r) => r.externalId },
  ...snapshotColumns("H1"),
  ...snapshotColumns("H7"),
];

export function postsCsv(rows: readonly PostExportRow[]): string {
  return buildCsv(POST_COLUMNS, rows);
}

// ---- Snapshot followers ----

export interface FollowerExportRow {
  platform: Platform;
  date: Date;
  followers: number;
  source: DataSource;
}

interface FollowerSheetRow extends FollowerExportRow {
  change: number | null;
}

export const FOLLOWER_COLUMNS: readonly CsvColumn<FollowerSheetRow>[] = [
  { header: "Tanggal (WIB)", value: (r) => csvDate(r.date) },
  { header: "Platform", value: (r) => PLATFORM_LABELS[r.platform] },
  { header: "Followers", value: (r) => r.followers },
  { header: "Perubahan dari snapshot sebelumnya", value: (r) => r.change },
  { header: "Sumber", value: (r) => SOURCE_LABELS[r.source] },
];

/** Urut tanggal lalu platform; perubahan dihitung per platform (tidak pernah lintas platform). */
export function followersCsv(rows: readonly FollowerExportRow[]): string {
  const platformOrder = (platform: Platform) => PLATFORMS.indexOf(platform);
  const sorted = [...rows].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || platformOrder(a.platform) - platformOrder(b.platform),
  );
  const previous = new Map<Platform, number>();
  const sheet = sorted.map((row): FollowerSheetRow => {
    const before = previous.get(row.platform);
    previous.set(row.platform, row.followers);
    return { ...row, change: before === undefined ? null : row.followers - before };
  });
  return buildCsv(FOLLOWER_COLUMNS, sheet);
}

// ---- Karya ----

export interface ArtworkExportRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  medium: Medium | null;
  year: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  materials: string | null;
  weightGram: number | null;
  visibility: ArtworkVisibility;
  availability: Availability;
  priceIdr: number | null;
  showPrice: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: { title: string } | null;
  images: { storageKey: string; isCover: boolean; isProcess: boolean }[];
  contents: { contentId: string }[];
}

export const ARTWORK_COLUMNS: readonly CsvColumn<ArtworkExportRow>[] = [
  { header: "ID", value: (r) => r.id },
  { header: "Slug", value: (r) => r.slug },
  { header: "Judul", value: (r) => r.title },
  { header: "Visibilitas", value: (r) => ARTWORK_VISIBILITY_LABELS[r.visibility] },
  { header: "Ketersediaan", value: (r) => AVAILABILITY_LABELS[r.availability] },
  { header: "Harga (Rp)", value: (r) => r.priceIdr },
  { header: "Tampilkan harga", value: (r) => r.showPrice },
  { header: "Unggulan", value: (r) => r.isFeatured },
  { header: "Urutan unggulan", value: (r) => r.featuredOrder },
  { header: "Medium", value: (r) => mediumLabel(r.medium) },
  { header: "Tahun", value: (r) => r.year },
  { header: "Lebar (cm)", value: (r) => r.widthCm },
  { header: "Tinggi (cm)", value: (r) => r.heightCm },
  { header: "Kedalaman (cm)", value: (r) => r.depthCm },
  { header: "Berat (gram)", value: (r) => r.weightGram },
  { header: "Bahan", value: (r) => r.materials },
  { header: "Proyek", value: (r) => r.project?.title },
  { header: "Ringkasan", value: (r) => r.summary },
  { header: "Deskripsi", value: (r) => r.description },
  { header: "Foto karya (jumlah)", value: (r) => r.images.filter((image) => !image.isProcess).length },
  { header: "Foto proses (jumlah)", value: (r) => r.images.filter((image) => image.isProcess).length },
  { header: "Cover (storageKey)", value: (r) => r.images.find((image) => image.isCover)?.storageKey },
  { header: "Konten terkait (jumlah)", value: (r) => r.contents.length },
  { header: "Terbit (WIB)", value: (r) => csvDateTime(r.publishedAt) },
  { header: "Dibuat (WIB)", value: (r) => csvDateTime(r.createdAt) },
  { header: "Diubah (WIB)", value: (r) => csvDateTime(r.updatedAt) },
];

export function artworksCsv(rows: readonly ArtworkExportRow[]): string {
  return buildCsv(ARTWORK_COLUMNS, rows);
}
