import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label kecil di atas judul (gaya editorial). */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase", className)}>{children}</p>;
}

/** Judul bagian (h2) + tautan opsional "Lihat semua". `id` dipakai `aria-labelledby` di section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  action,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-10", className)}>
      <div className="grid gap-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 id={id} className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      {action && <ArrowLink href={action.href}>{action.label}</ArrowLink>}
    </div>
  );
}

/** Tautan teks dengan panah (target sentuh ≥ 44 px tinggi). */
export function ArrowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/arrow inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform group-hover/arrow:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

/** Tombol-tautan bulat (primer = isi gelap, sekunder = garis). */
export function pillLinkClass(variant: "primary" | "secondary" = "primary", className?: string): string {
  return cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    variant === "primary"
      ? "bg-foreground text-background hover:bg-foreground/85"
      : "border border-border bg-background hover:bg-muted",
    className,
  );
}
