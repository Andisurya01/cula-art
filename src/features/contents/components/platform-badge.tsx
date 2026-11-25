import type { Platform } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const SHORT: Record<Platform, string> = { TIKTOK: "TT", INSTAGRAM: "IG" };

/**
 * Varian badge per platform: token netral (pil penuh vs garis), bukan warna merek atau warna seri
 * grafik, supaya tetap terbaca di semua tema dan mode. Garis Instagram sedikit lebih tegas supaya
 * tetap terlihat di atas kartu abu.
 */
const VARIANT: Record<Platform, "default" | "outline"> = {
  TIKTOK: "default",
  INSTAGRAM: "outline",
};

/** Label singkat platform (lucide tidak punya ikon merek). */
export function PlatformBadge({
  platform,
  full = false,
  className,
}: {
  platform: Platform;
  full?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={VARIANT[platform]}
      title={PLATFORM_LABELS[platform]}
      aria-label={PLATFORM_LABELS[platform]}
      className={cn(platform === "INSTAGRAM" && "border-foreground/25", className)}
    >
      {full ? PLATFORM_LABELS[platform] : SHORT[platform]}
    </Badge>
  );
}
