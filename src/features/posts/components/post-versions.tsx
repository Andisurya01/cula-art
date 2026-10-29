"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import type { ContentPost } from "@/features/contents/queries";
import { createPost } from "../actions";
import { PostVersionForm } from "./post-version-form";
import { callAction } from "@/lib/action-client";

/** Versi per platform (maksimal satu per platform). */
export function PostVersions({ contentId, posts }: { contentId: string; posts: ContentPost[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const missing = PLATFORMS.filter((p) => !posts.some((post) => post.platform === p));

  function onAdd(platform: Platform) {
    startTransition(async () => {
      const result = await callAction(() => createPost({ contentId, platform }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Versi ${PLATFORM_LABELS[platform]} ditambahkan`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versi platform</CardTitle>
        <CardDescription>
          Caption, hashtag, dan jadwal sendiri untuk tiap platform. Waktu dalam WIB.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        {posts.map((post) => (
          // Remount saat data post berubah di server (mis. setelah Pindah ke Posted).
          <PostVersionForm key={`${post.id}-${post.updatedAt.getTime()}`} post={post} />
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada versi. Tambahkan versi TikTok dan/atau Instagram untuk menjadwalkan.
          </p>
        )}
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missing.map((platform) => (
              <Button
                key={platform}
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onAdd(platform)}
              >
                <Plus />
                Versi {PLATFORM_LABELS[platform]}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
