"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, KeyRound, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveAiTechnicalSettings } from "@/features/ai/actions";
import {
  aiTechnicalSettingsSchema,
  MAX_DAILY_CALL_LIMIT,
  MAX_MONTHLY_BUDGET_USD,
  MIN_MONTHLY_BUDGET_USD,
  type AiTechnicalSettings,
} from "@/features/ai/guide-schema";
import { formatUsd } from "@/features/ai/format";
import { AI_MODEL_IDS, AI_MODELS, isAiModelId } from "@/features/ai/models";
import { useRunAction } from "../use-run-action";
import { GuideField } from "./guide-field";

/** AI aktif/nonaktif, model, batas biaya bulanan dan panggilan harian, serta status kunci API. */
export function AiTechnicalCard({
  settings,
  hasApiKey,
  mock,
}: {
  settings: AiTechnicalSettings;
  hasApiKey: boolean;
  mock: boolean;
}) {
  const { pending, run } = useRunAction();
  const form = useForm<AiTechnicalSettings>({
    resolver: zodResolver(aiTechnicalSettingsSchema),
    defaultValues: settings,
  });
  const { control, register } = form;
  const { errors, isDirty } = form.formState;
  const [isEnabled, model] = useWatch({ control, name: ["isEnabled", "model"] });
  const missingKey = !hasApiKey && !mock;

  const onSubmit = form.handleSubmit((values) => {
    run(() => saveAiTechnicalSettings(values), {
      success: "Pengaturan AI disimpan",
      onOk: () => form.reset(values),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan teknis</CardTitle>
        <CardDescription>
          Setiap permintaan dicek terhadap batas di bawah sebelum dikirim. Hari dan bulan dihitung dalam WIB.
        </CardDescription>
        {mock && (
          <CardAction>
            <Badge variant="secondary">Mode uji</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        <ApiKeyStatus hasApiKey={hasApiKey} mock={mock} />

        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-1">
              <Label htmlFor="ai-enabled">AI aktif</Label>
              <p className="text-xs text-muted-foreground">
                Saat nonaktif, tombol Bantu AI disembunyikan di seluruh Studio.
              </p>
            </div>
            <Controller
              control={control}
              name="isEnabled"
              render={({ field }) => (
                <Switch
                  id="ai-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </div>

          {isEnabled && missingKey && (
            <Alert>
              <TriangleAlert />
              <AlertDescription>
                Kunci API belum terpasang, jadi setiap permintaan Bantu AI akan gagal sampai{" "}
                <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> diisi di .env server dan server
                di-restart. Pengaturan tetap bisa disimpan.
              </AlertDescription>
            </Alert>
          )}

          <Controller
            control={control}
            name="model"
            render={({ field, fieldState }) => (
              <GuideField
                id="ai-model"
                label="Model"
                hint={isAiModelId(model) ? AI_MODELS[model].note : undefined}
                error={fieldState.error?.message}
              >
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="ai-model"
                    className="w-full sm:w-64"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Pilih model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODEL_IDS.map((id) => (
                      <SelectItem key={id} value={id}>
                        {AI_MODELS[id].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </GuideField>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <GuideField
              id="ai-monthly-budget"
              label="Batas biaya per bulan"
              hint={`Antara ${formatUsd(MIN_MONTHLY_BUDGET_USD)} dan ${formatUsd(MAX_MONTHLY_BUDGET_USD)}. Permintaan ditolak setelah biaya bulan ini mencapai batas.`}
              error={errors.monthlyBudgetUsd?.message}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground" aria-hidden>
                  US$
                </span>
                <Input
                  id="ai-monthly-budget"
                  type="number"
                  inputMode="decimal"
                  min={MIN_MONTHLY_BUDGET_USD}
                  max={MAX_MONTHLY_BUDGET_USD}
                  step="0.01"
                  className="w-28"
                  aria-invalid={!!errors.monthlyBudgetUsd}
                  {...register("monthlyBudgetUsd", { valueAsNumber: true })}
                />
              </div>
            </GuideField>
            <GuideField
              id="ai-daily-limit"
              label="Batas panggilan per hari"
              hint={`1-${MAX_DAILY_CALL_LIMIT}. Semua panggilan dihitung, termasuk yang gagal.`}
              error={errors.dailyCallLimit?.message}
            >
              <Input
                id="ai-daily-limit"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_DAILY_CALL_LIMIT}
                step={1}
                className="w-28"
                aria-invalid={!!errors.dailyCallLimit}
                {...register("dailyCallLimit", { valueAsNumber: true })}
              />
            </GuideField>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Menyimpan…" : "Simpan pengaturan"}
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

/** Hanya status terpasang/belum; isi kunci tidak pernah sampai ke browser. */
function ApiKeyStatus({ hasApiKey, mock }: { hasApiKey: boolean; mock: boolean }) {
  const Icon = hasApiKey ? CircleCheck : KeyRound;
  return (
    <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            hasApiKey ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <div className="grid gap-0.5">
          <p className="font-medium">Kunci API: {hasApiKey ? "terpasang" : "belum terpasang"}</p>
          {!hasApiKey && (
            <p className="text-xs text-muted-foreground">
              Isi <code className="font-mono">ANTHROPIC_API_KEY</code> di .env server lalu restart.
            </p>
          )}
        </div>
      </div>
      {mock && (
        <p className="text-xs text-muted-foreground">
          Mode uji aktif (<code className="font-mono">AI_MOCK=1</code>): semua tombol Bantu AI memakai jawaban
          contoh tanpa memanggil API, biaya 0.
        </p>
      )}
    </div>
  );
}
