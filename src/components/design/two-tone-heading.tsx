import { RevealLines } from "@/components/motion/reveal-lines";
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
 * `reveal` (Fase 7): kedua bagian muncul per baris dengan mask naik, berjeda token `stagger`
 * (`load` = saat halaman tampil, untuk hero; `scroll` = saat terlihat). Tidak berlaku untuk `inline`.
 */
export function TwoToneHeading({
  as: Tag = "h2",
  level = "h2",
  first,
  second,
  inline = false,
  className,
  id,
  reveal,
  revealDelay = 0,
}: {
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  level?: TwoToneLevel;
  first: React.ReactNode;
  second?: React.ReactNode;
  /** `true`: bagian kedua menyambung di baris yang sama (bisa terbungkus), bukan baris baru. */
  inline?: boolean;
  className?: string;
  id?: string;
  reveal?: "load" | "scroll";
  /** Urutan awal baris pertama (satuan jeda), jika ada elemen lain yang muncul lebih dulu. */
  revealDelay?: number;
}) {
  const classes = cn("font-heading text-balance", LEVEL_CLASS[level], className);
  if (reveal && !inline) {
    const lines = [{ content: first, className: "text-foreground" }];
    if (second) lines.push({ content: second, className: "text-heading-muted" });
    return <RevealLines as={Tag} id={id} lines={lines} trigger={reveal} delay={revealDelay} className={classes} />;
  }
  const part = inline ? "inline" : "block";
  return (
    <Tag id={id} className={classes}>
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
