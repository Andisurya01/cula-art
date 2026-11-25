import { cn } from "@/lib/utils";

/**
 * Pil statistik (referensi Galeri): angka besar di lingkaran + keterangan, dengan gradien halus dari
 * warna permukaan ke aksen. `shape="circle"`: angka dan keterangan dalam satu lingkaran.
 * Semua warna dari token.
 */
export function StatPill({
  value,
  label,
  hint,
  shape = "pill",
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  hint?: React.ReactNode;
  shape?: "pill" | "circle";
  className?: string;
}) {
  if (shape === "circle") {
    return (
      <div
        className={cn(
          "flex aspect-square w-full max-w-56 flex-col items-center justify-center rounded-full bg-card p-6 text-center ring-1 ring-border/70",
          className,
        )}
      >
        <p className="font-heading text-h2">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="type-label mt-1 text-muted-foreground">{hint}</p> : null}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-4 rounded-full bg-linear-to-r from-card from-35% via-bento-blue/10 to-accent/25 p-2 pr-6 ring-1 ring-border/70 sm:gap-6",
        className,
      )}
    >
      <p className="flex aspect-square w-20 shrink-0 items-center justify-center rounded-full bg-background font-heading text-h4 ring-1 ring-border/70 sm:w-28 sm:text-h3">
        {value}
      </p>
      <div className="min-w-0">
        <p className="text-sm text-foreground sm:text-base">{label}</p>
        {/* Warna teks penuh: teks redup di atas ujung gradien aksen hanya ±3,5:1. */}
        {hint ? <p className="type-label mt-1 text-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
