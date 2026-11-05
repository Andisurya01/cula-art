"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveAiGuideContent } from "@/features/ai/actions";
import type { AiGuideContent } from "@/features/ai/guide-schema";
import {
  aiGuideFormSchema,
  firstErrorMessage,
  toAiGuideFormValues,
  type AiGuideFormValues,
} from "../../ai-guide";
import type { PillarRow } from "../../queries";
import { useRunAction } from "../use-run-action";
import { ExamplesSection } from "./examples-section";
import { GuideField } from "./guide-field";
import { HashtagSection } from "./hashtag-section";
import { VoiceSection } from "./voice-section";

/** Isi Panduan AI: bagian awal prompt yang dipakai di setiap permintaan Bantu AI. */
export function AiGuideContentForm({ guide, pillars }: { guide: AiGuideContent; pillars: PillarRow[] }) {
  const { pending, run } = useRunAction();
  const form = useForm<AiGuideFormValues, unknown, AiGuideContent>({
    resolver: zodResolver(aiGuideFormSchema),
    defaultValues: toAiGuideFormValues(guide, pillars),
  });
  const { control, register } = form;
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(
    (values) => {
      run(() => saveAiGuideContent(values), {
        success: "Panduan AI disimpan",
        // Tampilkan bentuk yang tersimpan (mis. "gambar, clay" → "#gambar #clay").
        onOk: () => form.reset(toAiGuideFormValues(values, pillars)),
      });
    },
    (invalid) => toast.error(firstErrorMessage(invalid) ?? "Periksa isian Panduan AI."),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Isi Panduan AI</CardTitle>
        <CardDescription>
          Dikirim di awal setiap permintaan Bantu AI. AI hanya memakai fakta dari sini dan data aplikasi;
          bagian yang kosong tidak dikarang.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-6">
          <VoiceSection control={control} register={register} />

          <Separator />
          <ExamplesSection control={control} register={register} />

          <Separator />
          <GuideField
            id="ai-creator-facts"
            label="Fakta kreator dan karya"
            hint="Alat, bahan, gaya, dan perjalanan belajar. Tulis yang benar saja; AI tidak menambah fakta lain."
            error={errors.creatorFacts?.message}
          >
            <Textarea
              id="ai-creator-facts"
              rows={6}
              className="max-h-[32rem]"
              maxLength={5000}
              aria-invalid={!!errors.creatorFacts}
              {...register("creatorFacts")}
            />
          </GuideField>

          <Separator />
          <HashtagSection control={control} pillars={pillars} />

          <Separator />
          <GuideField
            id="ai-avoid-notes"
            label="Kata atau topik yang dihindari"
            hint="Satu per baris, mis. kata yang tidak kamu pakai atau topik yang tidak ingin disinggung."
            error={errors.avoidNotes?.message}
          >
            <Textarea
              id="ai-avoid-notes"
              rows={3}
              maxLength={2000}
              aria-invalid={!!errors.avoidNotes}
              {...register("avoidNotes")}
            />
          </GuideField>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Menyimpan…" : "Simpan panduan"}
            </Button>
            {isDirty && !pending && (
              <Button type="button" variant="ghost" onClick={() => form.reset()}>
                Batalkan perubahan
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
