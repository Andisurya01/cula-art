import type { Availability } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";

type Tone = "success" | "warning" | "destructive" | "secondary";

/** Warna status dari token tema: Tersedia = sukses, Dipesan = peringatan, Terjual = destruktif. */
const TONE: Record<Availability, Tone> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  SOLD: "destructive",
  NOT_FOR_SALE: "secondary",
};

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  secondary: "bg-muted-foreground",
};

/**
 * Badge ketersediaan. Biasa: latar tipis warna status (`Badge`). `overlay` (di atas foto): pil
 * permukaan solid dengan titik warna status, supaya teks tetap terbaca di atas foto apa pun.
 */
export function AvailabilityBadge({
  availability,
  overlay = false,
  className,
}: {
  availability: Availability;
  overlay?: boolean;
  className?: string;
}) {
  const tone = TONE[availability];
  if (overlay) {
    return (
      <span
        className={cn(
          "inline-flex h-6 w-fit items-center gap-1.5 rounded-badge bg-card px-2.5 text-caption font-medium whitespace-nowrap text-card-foreground shadow-sm",
          className,
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
        {galleryCopy.availability[availability]}
      </span>
    );
  }
  return (
    <Badge variant={tone} className={className}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      {galleryCopy.availability[availability]}
    </Badge>
  );
}
