"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { callAction } from "@/lib/action-client";
import { saveWeeklyReview } from "../actions";
import {
  REVIEW_FIELD_LABELS,
  REVIEW_FIELD_MAX,
  reviewFormSchema,
  type ReviewFormValues,
  type ReviewTextField,
} from "../schema";
import { PlanSection, type PlanSectionData } from "./plan-section";
import { ReviewDraftAssist } from "./review-draft-assist";

const EMPTY: ReviewFormValues = { wins: "", repeat: "", stop: "", focusNext: "", plannedContentIds: [] };

const PLACEHOLDERS: Record<ReviewTextField, string> = {
  wins: "- Time-lapse clay di jam 19.00 ramai saves",
  repeat: "- Hook hari ke-N untuk seri berikutnya",
  stop: "- Posting tanpa caption yang jelas",
  focusNext: "- Selesaikan part 3 seri naga",
};

/**
 * Refleksi, fokus, dan rencana minggu depan (Flow 5 langkah 4-5). Satu tombol Simpan untuk semuanya.
 * Render dengan `key` = minggu supaya form direset saat pindah minggu.
 */
export function ReviewForm({
  weekKey,
  saved,
  plan,
}: {
  weekKey: string;
  saved: ReviewFormValues | null;
  plan: PlanSectionData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: saved ?? EMPTY,
  });
  const { errors, isDirty } = form.formState;
  const known = new Set(plan.options.map((option) => option.id));

  const onSubmit = form.handleSubmit((values) => {
    // Konten yang hilang dari daftar (mis. baru dihapus) tidak ikut disimpan.
    const next = { ...values, plannedContentIds: values.plannedContentIds.filter((id) => known.has(id)) };
    startTransition(async () => {
      const result = await callAction(() => saveWeeklyReview({ ...next, weekStart: weekKey }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(saved ? "Review diperbarui; ringkasan dibekukan ulang dengan angka terbaru" : "Review tersimpan");
      form.reset(next);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Refleksi</CardTitle>
          <CardDescription>Jawab singkat, boleh satu poin per baris.</CardDescription>
          <CardAction>
            <ReviewDraftAssist form={form} weekKey={weekKey} />
          </CardAction>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          {(["wins", "repeat", "stop"] as const).map((name) => (
            <ReviewTextarea key={name} form={form} name={name} error={errors[name]?.message} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minggu depan</CardTitle>
          <CardDescription>Fokus dan 2-3 konten untuk slot {plan.weekLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5">
          <ReviewTextarea form={form} name="focusNext" error={errors.focusNext?.message} />
          <PlanSection form={form} plan={plan} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isDirty && <span className="text-xs text-muted-foreground">Ada perubahan yang belum tersimpan.</span>}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : saved ? "Simpan ulang review" : "Simpan review"}
        </Button>
      </div>
    </form>
  );
}

function ReviewTextarea({
  form,
  name,
  error,
}: {
  form: UseFormReturn<ReviewFormValues>;
  name: ReviewTextField;
  error: string | undefined;
}) {
  const id = `review-${name}`;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2">
      <Label htmlFor={id}>{REVIEW_FIELD_LABELS[name]}</Label>
      <Textarea
        id={id}
        rows={name === "focusNext" ? 3 : 4}
        maxLength={REVIEW_FIELD_MAX}
        placeholder={PLACEHOLDERS[name]}
        aria-invalid={!!error}
        {...form.register(name)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
