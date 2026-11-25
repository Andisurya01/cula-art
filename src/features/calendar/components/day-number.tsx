import { cn } from "@/lib/utils";

/** Nomor tanggal di kalender; hari ini = lingkaran primer (pil aktif ala referensi Studio). */
export function DayNumber({ today, children }: { today: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full tabular-nums",
        today && "bg-primary font-semibold text-primary-foreground",
      )}
    >
      {children}
    </span>
  );
}
