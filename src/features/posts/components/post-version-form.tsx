"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PostType } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toWibInputValue } from "@/lib/date";
import { PLATFORM_LABELS, POST_TYPE_LABELS } from "@/lib/labels";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import type { ContentPost } from "@/features/contents/queries";
import { deletePost, updatePost } from "../actions";
import {
  POST_TYPES_BY_PLATFORM,
  postFormSchema,
  type PostFormOutput,
  type PostFormValues,
} from "../schema";

import { callAction } from "@/lib/action-client";
function toDefaults(post: ContentPost): PostFormValues {
  return {
    postType: post.postType,
    caption: post.caption ?? "",
    hashtags: post.hashtags ?? "",
    scheduledAt: post.scheduledAt ? toWibInputValue(post.scheduledAt) : "",
    url: post.url ?? "",
    postedAt: post.postedAt ? toWibInputValue(post.postedAt) : "",
    durationSec: post.durationSec?.toString() ?? "",
  };
}

/** Form satu versi platform (TikTok/Instagram) + hapus versi. */
export function PostVersionForm({ post }: { post: ContentPost }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<PostFormValues, unknown, PostFormOutput>({
    resolver: zodResolver(postFormSchema),
    defaultValues: toDefaults(post),
  });
  const { errors, isDirty } = form.formState;
  const id = (field: string) => `post-${post.id}-${field}`;

  // Tipe yang tersedia untuk platform ini (+ tipe saat ini jika data lama tidak sesuai).
  const postTypes: PostType[] = Array.from(
    new Set<PostType>([...POST_TYPES_BY_PLATFORM[post.platform], post.postType]),
  );

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => updatePost({ id: post.id, ...values }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Versi ${PLATFORM_LABELS[post.platform]} tersimpan`);
      form.reset(form.getValues());
      router.refresh();
    });
  });

  function onDelete() {
    startTransition(async () => {
      const result = await callAction(() => deletePost({ id: post.id }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Versi ${PLATFORM_LABELS[post.platform]} dihapus`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={post.platform} full />
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Buka post <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Hapus versi ${PLATFORM_LABELS[post.platform]}`}
              disabled={pending}
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus versi {PLATFORM_LABELS[post.platform]}?</AlertDialogTitle>
              <AlertDialogDescription>
                Caption, jadwal, link, dan metrik versi ini ikut terhapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id("type")} label="Tipe post" error={errors.postType?.message}>
          <Controller
            control={form.control}
            name="postType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id("type")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {postTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {POST_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id={id("schedule")} label="Jadwal (WIB)" error={errors.scheduledAt?.message}>
          <Input
            id={id("schedule")}
            type="datetime-local"
            aria-invalid={!!errors.scheduledAt}
            {...form.register("scheduledAt")}
          />
        </Field>
      </div>

      <Field id={id("caption")} label="Caption" error={errors.caption?.message}>
        <Textarea
          id={id("caption")}
          rows={3}
          aria-invalid={!!errors.caption}
          {...form.register("caption")}
        />
      </Field>
      <Field id={id("hashtags")} label="Hashtag" error={errors.hashtags?.message}>
        <Input
          id={id("hashtags")}
          placeholder="#clay #sculpting"
          autoComplete="off"
          aria-invalid={!!errors.hashtags}
          {...form.register("hashtags")}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_7rem]">
        <Field id={id("url")} label="URL post" error={errors.url?.message}>
          <Input
            id={id("url")}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            aria-invalid={!!errors.url}
            {...form.register("url")}
          />
        </Field>
        <Field id={id("posted")} label="Waktu posting (WIB)" error={errors.postedAt?.message}>
          <Input
            id={id("posted")}
            type="datetime-local"
            aria-invalid={!!errors.postedAt}
            {...form.register("postedAt")}
          />
        </Field>
        <Field id={id("duration")} label="Durasi (detik)" error={errors.durationSec?.message}>
          <Input
            id={id("duration")}
            type="number"
            inputMode="numeric"
            min={1}
            max={3600}
            aria-invalid={!!errors.durationSec}
            {...form.register("durationSec")}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !isDirty}
          className="w-full sm:w-auto"
        >
          {pending ? "Menyimpan…" : `Simpan versi ${PLATFORM_LABELS[post.platform]}`}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
