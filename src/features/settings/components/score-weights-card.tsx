"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from "@/lib/analytics/metrics";
import { updateScoreWeights } from "../actions";
import { scoreWeightsInputSchema } from "../schema";
import { useRunAction } from "./use-run-action";

const FIELDS: { key: keyof ScoreWeights; label: string }[] = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Komentar" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "follows", label: "Follows" },
];

/** Bobot skor konten = Σ(bobot × metrik) / views × 1000. */
export function ScoreWeightsCard({ weights }: { weights: ScoreWeights }) {
  const { pending, run } = useRunAction();
  const form = useForm<ScoreWeights>({
    resolver: zodResolver(scoreWeightsInputSchema),
    defaultValues: weights,
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    run(() => updateScoreWeights(values), {
      success: "Bobot skor disimpan",
      onOk: () => form.reset(values),
    });
  });

  function onResetDefault() {
    for (const { key } of FIELDS) {
      form.setValue(key, DEFAULT_SCORE_WEIGHTS[key], { shouldDirty: true, shouldValidate: true });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bobot skor konten</CardTitle>
        <CardDescription>
          Skor = jumlah (bobot × metrik) dibagi views × 1000. Bobot lebih besar berarti metrik itu
          lebih dihargai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`weight-${key}`}>{label}</Label>
                <Input
                  id={`weight-${key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="any"
                  aria-invalid={!!errors[key]}
                  {...form.register(key, { valueAsNumber: true })}
                />
                {errors[key] && <p className="text-xs text-destructive">{errors[key].message}</p>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" variant="outline" onClick={onResetDefault} disabled={pending}>
              <RotateCcw />
              Kembalikan default
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Default: likes {DEFAULT_SCORE_WEIGHTS.likes}, komentar {DEFAULT_SCORE_WEIGHTS.comments},
            shares {DEFAULT_SCORE_WEIGHTS.shares}, saves {DEFAULT_SCORE_WEIGHTS.saves}, follows{" "}
            {DEFAULT_SCORE_WEIGHTS.follows}. Tekan Simpan setelah mengembalikan default.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
