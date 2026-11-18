"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ExperimentVariant } from "@/lib/analytics/experiments";
import { callAction } from "@/lib/action-client";
import { removeExperimentPost, setExperimentPost } from "../actions";

/** Tambah / pindah / lepas post varian, dengan toast dan muat ulang data halaman. */
export function useExperimentPost(experimentId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function assign(postId: string, variant: ExperimentVariant) {
    startTransition(async () => {
      const result = await callAction(() => setExperimentPost({ experimentId, postId, variant }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { previous } = result.data;
      toast.success(
        previous === null
          ? `Post masuk varian ${variant}`
          : previous === variant
            ? `Post sudah di varian ${variant}`
            : `Post dipindah ke varian ${variant}`,
      );
      router.refresh();
    });
  }

  function remove(postId: string) {
    startTransition(async () => {
      const result = await callAction(() => removeExperimentPost({ experimentId, postId }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Post dilepas dari eksperimen");
      router.refresh();
    });
  }

  return { pending, assign, remove };
}
