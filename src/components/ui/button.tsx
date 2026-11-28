import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Tombol mengikuti token tema (Fase 6): radius `rounded-button` (pil secara default), warna
// primer/sekunder dari token, durasi `duration-fast`. Opsi `arrow` menambah ikon ↗ (referensi Galeri).
// Ditekan sedikit mengecil (`motion-press`, 0,98; tanpa efek saat animasi Mati/kurangi gerakan).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-button border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale,opacity] duration-fast ease-standard outline-hidden select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:motion-press disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Pil hitam (terang) / terang (gelap). */
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        /** Pil abu muda. */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--secondary),var(--foreground)_6%)] aria-expanded:bg-[color-mix(in_srgb,var(--secondary),var(--foreground)_6%)]",
        outline:
          "border-border bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        // foreground/6, bukan bg-muted: tetap terlihat di atas permukaan abu (kartu muted, kalender).
        ghost: "hover:bg-foreground/6 hover:text-foreground aria-expanded:bg-foreground/6 aria-expanded:text-foreground",
        /** Warna aksen tema (ungu default). */
        accent: "bg-accent text-accent-foreground hover:bg-accent/85",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Tambah ikon ↗ di akhir (atau awal dengan `arrow="start"`). */
    arrow?: boolean | "start" | "end"
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  arrow = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const position = arrow === true ? "end" : arrow || null
  const icon = position ? (
    <ArrowUpRight
      aria-hidden
      data-icon={position === "start" ? "inline-start" : "inline-end"}
      // Fase 7: ikon ↗ bergeser sedikit saat hover/fokus (jarak dari token tingkat; diam saat Mati).
      className="transition-transform duration-base ease-standard group-hover/button:motion-nudge group-focus-visible/button:motion-nudge"
    />
  ) : null
  const shared = {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    className: cn(buttonVariants({ variant, size, className })),
    ...props,
  }

  // Slot hanya boleh menerima tepat SATU anak (tanpa saudara `false`/`null`), jadi tanpa ikon
  // anak diteruskan apa adanya. Dengan ikon, anak asli ditandai Slottable dan ikon jadi saudaranya.
  if (!icon) return <Comp {...shared}>{children}</Comp>
  const content = asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children
  return (
    <Comp {...shared}>
      {position === "start" ? icon : null}
      {content}
      {position === "end" ? icon : null}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
