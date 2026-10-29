// Label UI (bahasa Indonesia) untuk enum Prisma. Aman dipakai di client component:
// hanya import tipe dari @prisma/client.

import type {
  ArtworkVisibility,
  Availability,
  ContentStage,
  IdeaStatus,
  Medium,
  Platform,
  PostType,
  ProjectStage,
} from "@prisma/client";

export const CONTENT_STAGES = [
  "PLANNING",
  "PRODUCTION",
  "EDITING",
  "READY",
  "POSTED",
] as const satisfies readonly ContentStage[];

export const CONTENT_STAGE_LABELS: Record<ContentStage, string> = {
  PLANNING: "Perencanaan",
  PRODUCTION: "Produksi",
  EDITING: "Editing",
  READY: "Siap Posting",
  POSTED: "Posted",
};

export const MEDIUMS = ["DRAWING", "CLAY", "MIXED"] as const satisfies readonly Medium[];

export const MEDIUM_LABELS: Record<Medium, string> = {
  DRAWING: "Gambar",
  CLAY: "Clay",
  MIXED: "Campuran",
};

export const IDEA_STATUSES = ["NEW", "PICKED", "ARCHIVED"] as const satisfies readonly IdeaStatus[];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  NEW: "Baru",
  PICKED: "Dipilih",
  ARCHIVED: "Diarsipkan",
};

export const PLATFORMS = ["TIKTOK", "INSTAGRAM"] as const satisfies readonly Platform[];

export const PLATFORM_LABELS: Record<Platform, string> = {
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
};

export const POST_TYPES = ["VIDEO", "REEL", "CAROUSEL", "STORY"] as const satisfies readonly PostType[];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  VIDEO: "Video",
  REEL: "Reel",
  CAROUSEL: "Carousel",
  STORY: "Story",
};

/** Tipe post default per platform saat versi baru dibuat. */
export const DEFAULT_POST_TYPE: Record<Platform, PostType> = {
  TIKTOK: "VIDEO",
  INSTAGRAM: "REEL",
};

export const PROJECT_STAGES = [
  "PLANNING",
  "IN_PROGRESS",
  "DONE",
  "PAUSED",
] as const satisfies readonly ProjectStage[];

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  PLANNING: "Rencana",
  IN_PROGRESS: "Berjalan",
  DONE: "Selesai",
  PAUSED: "Ditunda",
};

export const ARTWORK_VISIBILITIES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly ArtworkVisibility[];

export const ARTWORK_VISIBILITY_LABELS: Record<ArtworkVisibility, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Terbit",
  ARCHIVED: "Diarsipkan",
};

export const AVAILABILITIES = [
  "NOT_FOR_SALE",
  "AVAILABLE",
  "RESERVED",
  "SOLD",
] as const satisfies readonly Availability[];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  NOT_FOR_SALE: "Koleksi pribadi",
  AVAILABLE: "Tersedia",
  RESERVED: "Dipesan",
  SOLD: "Terjual",
};

/** Ide berstatus Baru kurang dari angka ini → "bank ide menipis". */
export const IDEA_BANK_LOW_THRESHOLD = 5;
