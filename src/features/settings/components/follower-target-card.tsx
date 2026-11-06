"use client";

import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { updateFollowerTarget } from "../actions";
import {
  followerTargetInputSchema,
  type FollowerTarget,
  type FollowerTargetInput,
  type FollowerTargetValues,
} from "../schema";
import { followerTargetFormValues } from "../utils";
import { useRunAction } from "./use-run-action";

const PLATFORM_FIELDS = {
  TIKTOK: { followers: "tiktokFollowers", er: "tiktokEr" },
  INSTAGRAM: { followers: "igFollowers", er: "igEr" },
} as const satisfies Record<Platform, { followers: keyof FollowerTarget; er: keyof FollowerTarget }>;

/** Target followers dan ER per platform, opsional. Dibaca Analitik sebagai pembanding KPI. */
export function FollowerTargetCard({ target }: { target: FollowerTarget }) {
  const { pending, run } = useRunAction();
  const form = useForm<FollowerTargetInput, unknown, FollowerTargetValues>({
    resolver: zodResolver(followerTargetInputSchema),
    defaultValues: followerTargetFormValues(target),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    run(() => updateFollowerTarget(values), {
      success: "Target 3 bulan disimpan",
      // Teks form mengikuti angka yang tersimpan, mis. "12,3K" menjadi "12300".
      onOk: () => form.reset(followerTargetFormValues(values)),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target 3 bulan</CardTitle>
        <CardDescription>
          Angka ini hanya pembanding di Analitik dan boleh dikosongkan. Target yang kosong tidak
          ditampilkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            {PLATFORMS.map((platform) => {
              const { followers, er } = PLATFORM_FIELDS[platform];
              return (
                <fieldset key={platform} className="min-w-0">
                  <legend className="mb-2 text-sm font-medium">{PLATFORM_LABELS[platform]}</legend>
                  <div className="grid grid-cols-2 items-start gap-3">
                    <TargetInput
                      id={`follower-target-${followers}`}
                      label="Target followers"
                      inputMode="numeric"
                      placeholder="mis. 10.000"
                      error={errors[followers]?.message}
                      registration={form.register(followers)}
                    />
                    <TargetInput
                      id={`follower-target-${er}`}
                      label="Target ER (%)"
                      inputMode="decimal"
                      placeholder="mis. 8,5"
                      error={errors[er]?.message}
                      registration={form.register(er)}
                    />
                  </div>
                </fieldset>
              );
            })}
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

function TargetInput({
  id,
  label,
  inputMode,
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  inputMode: "numeric" | "decimal";
  placeholder: string;
  error: string | undefined;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={!!error}
        {...registration}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
