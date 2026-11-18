"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-client";
import { dismissSuggestion } from "../actions";

/** Tombol "Sembunyikan 7 hari" (E6). */
export function DismissSuggestionButton({
  suggestionKey,
  title,
  onDismissed,
}: {
  suggestionKey: string;
  /** Untuk aria-label, supaya beberapa tombol di satu halaman bisa dibedakan. */
  title: string;
  onDismissed?: (key: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await callAction(() => dismissSuggestion({ key: suggestionKey }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onDismissed?.(suggestionKey);
      toast.success("Saran disembunyikan 7 hari.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={pending}
      aria-label={`Sembunyikan 7 hari: ${title}`}
    >
      <EyeOff />
      {pending ? "Menyembunyikan…" : "Sembunyikan 7 hari"}
    </Button>
  );
}
