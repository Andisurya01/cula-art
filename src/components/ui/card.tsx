import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Kartu mengikuti token tema (Fase 6): radius `rounded-card` (atau `rounded-card-nested` untuk
// kartu di dalam kartu), warna permukaan, dan varian bento (biru, lime, ungu, gelap) untuk angka
// penting. Pada varian bento, deskripsi dan teks redup memakai warna teks bento.
const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden py-(--card-spacing) text-sm [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[inherit] *:[img:last-child]:rounded-b-[inherit]",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground ring-1 ring-border/70",
        /** Abu muda tanpa garis (kartu sekunder ala referensi Studio). */
        muted: "bg-muted text-foreground",
        blue: "bg-bento-blue text-bento-blue-foreground",
        lime: "bg-bento-lime text-bento-lime-foreground",
        purple: "bg-bento-purple text-bento-purple-foreground",
        dark: "bg-bento-dark text-bento-dark-foreground",
      },
      nested: {
        false: "rounded-card",
        true: "rounded-card-nested",
      },
    },
    defaultVariants: { variant: "default", nested: false },
  }
)

type CardVariant = NonNullable<VariantProps<typeof cardVariants>["variant"]>

const BENTO_VARIANTS: readonly CardVariant[] = ["blue", "lime", "purple", "dark"]

function Card({
  className,
  size = "default",
  variant = "default",
  nested = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  const tone = variant && BENTO_VARIANTS.includes(variant) ? "bento" : "surface"
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-tone={tone}
      className={cn(cardVariants({ variant, nested }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/** `as`: elemen judul semantik (mis. `h1` jika kartu adalah isi utama halaman). */
function CardTitle({
  className,
  as: Tag = "div",
  ...props
}: React.ComponentProps<"div"> & { as?: "div" | "h1" | "h2" | "h3" }) {
  return (
    <Tag
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm text-muted-foreground group-data-[tone=bento]/card:text-current",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t bg-muted/50 p-(--card-spacing) group-data-[tone=bento]/card:border-current/15 group-data-[tone=bento]/card:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
export type { CardVariant }
