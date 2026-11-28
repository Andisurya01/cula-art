import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IDEA_BANK_LOW_THRESHOLD } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { HOME_ALERT } from "./row-styles";

/**
 * Tampil jika ide berstatus Baru kurang dari ambang. Paling bawah di Beranda, jadi muncul saat di-scroll
 * (`Reveal` di sini, bukan di halaman, supaya tidak ada sel grid kosong saat banner tidak tampil).
 * `className` = sel grid (pembungkus).
 */
export function IdeaBankBanner({ newCount, className }: { newCount: number; className?: string }) {
  if (newCount >= IDEA_BANK_LOW_THRESHOLD) return null;
  return (
    <Reveal className={className}>
      <Alert className={cn(HOME_ALERT, "h-full")}>
        <Lightbulb />
        <AlertTitle>Bank ide menipis</AlertTitle>
        <AlertDescription>
          Tinggal {newCount} ide berstatus Baru. Catat beberapa ide lagi supaya pipeline tidak kosong.{" "}
          <Link href={routes.studio.ideas} className="font-medium underline underline-offset-4">
            Buka Bank Ide
          </Link>
        </AlertDescription>
      </Alert>
    </Reveal>
  );
}
