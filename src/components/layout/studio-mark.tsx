import { Asterisk } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Warna tombol + Ide (sidebar, bottom nav, tombol mengambang): lime bento, supaya tidak tertukar dengan
 * menu aktif yang berbentuk pil primer. Dipakai bersama `Button` (menimpa warna primer).
 */
export const QUICK_IDEA_BUTTON_CLASS = "bg-bento-lime text-bento-lime-foreground hover:bg-bento-lime/85";

/** Tanda bulat Studio (sidebar dan halaman masuk). Hiasan; nama "Studio" selalu tertulis di sebelahnya. */
export function StudioMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <Asterisk className="size-5" />
    </span>
  );
}
