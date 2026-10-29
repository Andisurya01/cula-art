"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";
import { callAction } from "@/lib/action-client";

/** Jalankan Server Action: toast error/sukses, lalu refresh data halaman. */
export function useRunAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionResult<unknown>>,
    options: { success?: string; onOk?: () => void } = {},
  ) {
    startTransition(async () => {
      const result = await callAction(() => action());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (options.success) toast.success(options.success);
      options.onOk?.();
      router.refresh();
    });
  }

  return { pending, run };
}
