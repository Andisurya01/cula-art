import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IDEA_BANK_LOW_THRESHOLD } from "@/lib/labels";
import { routes } from "@/lib/routes";

/** Tampil jika ide berstatus Baru kurang dari ambang. */
export function IdeaBankBanner({ newCount, className }: { newCount: number; className?: string }) {
  if (newCount >= IDEA_BANK_LOW_THRESHOLD) return null;
  return (
    <Alert className={className}>
      <Lightbulb />
      <AlertTitle>Bank ide menipis</AlertTitle>
      <AlertDescription>
        Tinggal {newCount} ide berstatus Baru. Catat beberapa ide lagi supaya pipeline tidak kosong.{" "}
        <Link href={routes.studio.ideas} className="font-medium underline underline-offset-4">
          Buka Bank Ide
        </Link>
      </AlertDescription>
    </Alert>
  );
}
