"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Bagian editor yang bisa dilipat (kartu radius besar ala Studio). `<details>` native. */
export function EditorSection({
  id,
  title,
  description,
  icon,
  status,
  open,
  onOpenChange,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next !== open) onOpenChange(next);
      }}
      className="group/section scroll-mt-28 rounded-card bg-card text-card-foreground ring-1 ring-border/70"
    >
      <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-card px-4 py-3 outline-hidden select-none focus-visible:ring-3 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="row-span-2 flex size-10 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-4"
        >
          {icon}
        </span>
        <h2 className="col-start-2 font-heading text-h5">{title}</h2>
        <span className="col-start-2 row-start-2 truncate text-body-sm text-muted-foreground">{description}</span>
        <span className="col-start-3 row-span-2 row-start-1 flex items-center gap-2">
          {status}
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard group-open/section:rotate-180"
          />
        </span>
      </summary>
      <div className="space-y-6 border-t px-4 py-5 sm:px-5">{children}</div>
    </details>
  );
}

/** Lencana status di judul bagian: isian salah (merah), peringatan (kuning), atau info. */
export function SectionStatus({
  tone,
  children,
  className,
}: {
  tone: "error" | "warning" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const variant = tone === "error" ? "destructive" : tone === "warning" ? "warning" : tone === "success" ? "success" : "secondary";
  return (
    <Badge variant={variant} className={cn("hidden sm:inline-flex", className)}>
      {children}
    </Badge>
  );
}

/** Versi ringkas untuk HP: titik berwarna + jumlah (teks lengkap untuk pembaca layar). */
export function SectionStatusDot({ tone, count, label }: { tone: "error" | "warning"; count: number; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-caption font-medium tabular-nums sm:hidden",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
      )}
    >
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
