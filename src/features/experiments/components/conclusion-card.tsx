"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExperimentResultValue } from "@/lib/analytics/experiments";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import { concludeExperiment, reopenExperiment } from "../actions";
import {
  concludeExperimentSchema,
  EXPERIMENT_RESULT_LABELS,
  EXPERIMENT_RESULTS,
  type ConcludeExperimentInput,
} from "../schema";
import { ChipButton, FieldError } from "./chip-button";
import { ExperimentResultBadge } from "./experiment-result-badge";

/**
 * Kesimpulan: form (nilai awal = usulan otomatis jika perbandingan sudah siap) atau hasil tersimpan + Buka lagi.
 * Keputusan tetap di tangan pengguna; usulan hanya mengisi pilihan awal.
 */
export function ConclusionCard({
  experimentId,
  result,
  notes,
  concludedAt,
  proposal,
}: {
  experimentId: string;
  result: ExperimentResultValue | null;
  notes: string | null;
  concludedAt: Date | null;
  /** Usulan otomatis; `null` = perbandingan belum siap (belum ada post atau menunggu H+7). */
  proposal: ExperimentResultValue | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kesimpulan</CardTitle>
        <CardDescription>
          {result === null
            ? "Pilih hasilnya dan catat apa yang dipelajari."
            : `Disimpulkan ${concludedAt ? formatWib(concludedAt, "d MMM yyyy, HH.mm") + " WIB" : ""}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result === null ? (
          <ConclusionForm experimentId={experimentId} notes={notes} proposal={proposal} />
        ) : (
          <ConcludedView experimentId={experimentId} result={result} notes={notes} />
        )}
      </CardContent>
    </Card>
  );
}

function ConclusionForm({
  experimentId,
  notes,
  proposal,
}: {
  experimentId: string;
  notes: string | null;
  proposal: ExperimentResultValue | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ConcludeExperimentInput>({
    resolver: zodResolver(concludeExperimentSchema),
    defaultValues: { id: experimentId, result: proposal ?? undefined, notes: notes ?? "" },
  });
  const { errors } = form.formState;
  const selected = useWatch({ control: form.control, name: "result" });

  // Usulan bisa berubah setelah post ditambah atau H+7 diisi; ikuti selama hasil belum dipilih sendiri.
  useEffect(() => {
    if (proposal && !form.getFieldState("result").isDirty) form.setValue("result", proposal);
  }, [proposal, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const saved = await callAction(() => concludeExperiment(values));
      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }
      toast.success(`Eksperimen disimpulkan: ${EXPERIMENT_RESULT_LABELS[values.result]}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label>Hasil</Label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIMENT_RESULTS.map((r) => (
            <ChipButton
              key={r}
              active={selected === r}
              invalid={!!errors.result}
              onClick={() => form.setValue("result", r, { shouldDirty: true, shouldValidate: true })}
            >
              {EXPERIMENT_RESULT_LABELS[r]}
              {proposal === r && <span className="opacity-70">(usulan)</span>}
            </ChipButton>
          ))}
        </div>
        <FieldError message={errors.result?.message} />
        {proposal === null && (
          <p className="text-xs text-muted-foreground">
            Perbandingan belum lengkap, jadi belum ada usulan. Kesimpulan tetap bisa disimpan, mis. jika eksperimen
            dihentikan.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`conclusion-notes-${experimentId}`}>Catatan</Label>
        <Textarea
          id={`conclusion-notes-${experimentId}`}
          rows={3}
          placeholder="Apa yang dipelajari, dan apa yang dicoba berikutnya…"
          aria-invalid={!!errors.notes}
          {...form.register("notes")}
        />
        <FieldError message={errors.notes?.message} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan kesimpulan"}
        </Button>
      </div>
    </form>
  );
}

function ConcludedView({
  experimentId,
  result,
  notes,
}: {
  experimentId: string;
  result: ExperimentResultValue;
  notes: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onReopen() {
    startTransition(async () => {
      const reopened = await callAction(() => reopenExperiment({ id: experimentId }));
      if (!reopened.ok) {
        toast.error(reopened.error);
        return;
      }
      toast.success("Eksperimen dibuka lagi");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <ExperimentResultBadge result={result} />
      {notes ? (
        <p className="text-sm whitespace-pre-line [overflow-wrap:anywhere]">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Tanpa catatan.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onReopen}>
          <RotateCcw />
          {pending ? "Membuka…" : "Buka lagi"}
        </Button>
        <span className="text-xs text-muted-foreground">Untuk menambah post atau mengubah kesimpulan.</span>
      </div>
    </div>
  );
}
