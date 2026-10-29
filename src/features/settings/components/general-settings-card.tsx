"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGeneralSettings } from "../actions";
import {
  generalSettingsSchema,
  type GeneralSettingsInput,
  type GeneralSettingsValues,
} from "../schema";
import { useRunAction } from "./use-run-action";

/** Target post per minggu. Handle TikTok/Instagram ada di tab "Profil publik". */
export function GeneralSettingsCard({ weeklyPostTarget }: { weeklyPostTarget: number }) {
  const { pending, run } = useRunAction();
  const form = useForm<GeneralSettingsInput, unknown, GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: { weeklyPostTarget },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    run(() => updateGeneralSettings(values), {
      success: "Target disimpan",
      onOk: () => form.reset(values),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target mingguan</CardTitle>
        <CardDescription>
          Target dihitung per konten, bukan per platform. Handle TikTok dan Instagram diatur di tab
          Profil publik.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="weekly-target">Target post per minggu</Label>
            <Input
              id="weekly-target"
              type="number"
              inputMode="numeric"
              min={1}
              max={14}
              step={1}
              className="w-24"
              aria-invalid={!!errors.weeklyPostTarget}
              {...form.register("weeklyPostTarget", { valueAsNumber: true })}
            />
            {errors.weeklyPostTarget && (
              <p className="text-xs text-destructive">{errors.weeklyPostTarget.message}</p>
            )}
          </div>

          <div>
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
