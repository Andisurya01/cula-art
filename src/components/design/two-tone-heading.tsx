import { cn } from "@/lib/utils";

const LEVEL_CLASS = {
  display: "text-display",
  h1: "text-h1",
  h2: "text-h2",
  // Hanya level besar: batas kontras judul baris kedua (3:1) berlaku untuk teks besar WCAG.
  h3: "text-h3",
} as const;

export type TwoToneLevel = keyof typeof LEVEL_CLASS;

/**
 * Judul dua warna (referensi Galeri): bagian pertama warna teks, bagian kedua warna "judul baris
 * kedua" (abu). Ukuran dari token level (`display`, `h1`…); tracking dan line-height ikut level.
 * Kedua bagian dibaca sebagai satu judul oleh pembaca layar.
 */
export function TwoToneHeading({
  as: Tag = "h2",
  level = "h2",
  first,
  second,
  inline = false,
  className,
  id,
}: {
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  level?: TwoToneLevel;
  first: React.ReactNode;
  second?: React.ReactNode;
  /** `true`: bagian kedua menyambung di baris yang sama (bisa terbungkus), bukan baris baru. */
  inline?: boolean;
  className?: string;
  id?: string;
}) {
  const part = inline ? "inline" : "block";
  return (
    <Tag id={id} className={cn("font-heading text-balance", LEVEL_CLASS[level], className)}>
      <span className={cn(part, "text-foreground")}>{first}</span>
      {second ? (
        <>
          {" "}
          <span className={cn(part, "text-heading-muted")}>{second}</span>
        </>
      ) : null}
    </Tag>
  );
}
