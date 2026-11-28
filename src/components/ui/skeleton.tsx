import { cn } from "@/lib/utils"

/**
 * Placeholder saat memuat (Fase 7): radius input token (ganti dengan `rounded-card` dsb. supaya
 * meniru bentuk aslinya) dan shimmer halus dari token durasi; diam saat animasi Mati atau
 * "kurangi gerakan". Dekoratif: bungkus skeleton halaman dengan `aria-busy`/teks sr-only.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("motion-shimmer rounded-input bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
