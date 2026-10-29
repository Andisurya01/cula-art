import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IDEA_BANK_LOW_THRESHOLD } from "@/lib/labels";

/** Tampil jika ide berstatus Baru kurang dari ambang. */
export function IdeaBankLowBanner({ newCount }: { newCount: number }) {
  if (newCount >= IDEA_BANK_LOW_THRESHOLD) return null;
  return (
    <Alert className="border-amber-500/40 bg-amber-500/10">
      <TriangleAlert className="text-amber-600 dark:text-amber-400" />
      <AlertTitle>Bank ide menipis</AlertTitle>
      <AlertDescription>
        {newCount === 0
          ? "Tidak ada ide berstatus Baru."
          : `Tinggal ${newCount} ide berstatus Baru.`}{" "}
        Catat minimal {IDEA_BANK_LOW_THRESHOLD} supaya ritme posting tidak tersendat.
      </AlertDescription>
    </Alert>
  );
}
