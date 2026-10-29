import type { Availability } from "@prisma/client";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";

// Titik warna hanya hiasan; status dibaca dari teksnya (kontras teks = foreground di atas background).
const DOT: Record<Availability, string> = {
  AVAILABLE: "bg-emerald-500",
  RESERVED: "bg-amber-500",
  SOLD: "bg-rose-500",
  NOT_FOR_SALE: "bg-muted-foreground",
};

/** Badge ketersediaan. `overlay`: di atas foto (latar semi-transparan). */
export function AvailabilityBadge({
  availability,
  overlay = false,
  className,
}: {
  availability: Availability;
  overlay?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        overlay ? "bg-background/90 text-foreground shadow-sm backdrop-blur-sm" : "border border-border bg-background",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[availability])} />
      {galleryCopy.availability[availability]}
    </span>
  );
}
