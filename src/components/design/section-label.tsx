import { cn } from "@/lib/utils";

/** Nomor bagian dua digit dalam kurung: 1 → "(01)". Teks lain apa adanya: "Euronium" → "(Euronium)". */
export function sectionIndex(value: number | string): string {
  const text = typeof value === "number" ? String(value).padStart(2, "0") : value;
  return `(${text})`;
}

/**
 * Label kecil bagian (referensi Galeri): "• TENTANG" di kiri dan nomor "(01)" di kanan.
 * Ukuran, ketebalan, tracking, dan huruf kapital dari token label (`type-label`).
 */
export function SectionLabel({
  children,
  index,
  dot = true,
  as: Tag = "p",
  className,
}: {
  children?: React.ReactNode;
  /** Nomor bagian; ditampilkan "(01)" di ujung kanan. */
  index?: number | string;
  /** Titik kecil sebelum label. */
  dot?: boolean;
  as?: "p" | "div" | "span";
  className?: string;
}) {
  return (
    <Tag className={cn("type-label flex items-center justify-between gap-4 text-muted-foreground", className)}>
      {children ? (
        <span className="inline-flex min-w-0 items-center gap-2">
          {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />}
          <span className="min-w-0">{children}</span>
        </span>
      ) : null}
      {index !== undefined && (
        <span aria-hidden className={cn("shrink-0 tabular-nums", !children && "ml-auto")}>
          {sectionIndex(index)}
        </span>
      )}
    </Tag>
  );
}

/** Baris meta kecil (mis. "KARYA GAMBAR & CLAY · SEJAK 2024"), tanpa titik dan nomor. */
export function MetaLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("type-label text-muted-foreground", className)}>{children}</span>;
}
