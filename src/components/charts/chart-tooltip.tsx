"use client";

/** Isi tooltip grafik: angka menonjol, nama seri di belakangnya, kunci berupa garis pendek. */
export function ChartTooltipCard({
  title,
  value,
  caption,
  color,
  note,
}: {
  title: string;
  value: string;
  caption: string;
  color: string;
  note?: string;
}) {
  return (
    <div className="grid max-w-56 gap-1 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="text-muted-foreground">{title}</p>
      <p className="flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        <span className="text-muted-foreground">{caption}</span>
      </p>
      {note && <p className="text-muted-foreground">{note}</p>}
    </div>
  );
}
