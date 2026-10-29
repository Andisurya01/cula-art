"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Availability, Medium } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { callAction } from "@/lib/action-client";
import { AVAILABILITIES, AVAILABILITY_LABELS, MEDIUMS, MEDIUM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import { updateArtwork } from "../actions";
import { isAutoSlug } from "../rules";
import { artworkDetailSchema, type ArtworkDetailFormValues, type ArtworkDetailInput } from "../schema";

const NONE = "__none__";

export type EditableArtwork = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  medium: Medium | null;
  year: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  materials: string | null;
  weightGram: number | null;
  projectId: string | null;
  availability: Availability;
  priceIdr: number | null;
  showPrice: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  publishedAt: Date | null;
};

const decimal = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

function toDefaults(a: EditableArtwork): ArtworkDetailFormValues {
  return {
    title: a.title,
    autoSlug: a.publishedAt === null && isAutoSlug(a.slug, a.title),
    slug: a.slug,
    summary: a.summary ?? "",
    description: a.description ?? "",
    medium: a.medium,
    year: a.year?.toString() ?? "",
    widthCm: decimal(a.widthCm),
    heightCm: decimal(a.heightCm),
    depthCm: decimal(a.depthCm),
    materials: a.materials ?? "",
    weightGram: a.weightGram?.toString() ?? "",
    projectId: a.projectId,
    availability: a.availability,
    priceIdr: a.priceIdr?.toString() ?? "",
    showPrice: a.showPrice,
    isFeatured: a.isFeatured,
    featuredOrder: a.featuredOrder.toString(),
  };
}

/** Form semua field karya (selain foto, video proses, dan status publikasi). */
export function ArtworkDetailForm({
  artwork,
  projects,
}: {
  artwork: EditableArtwork;
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ArtworkDetailFormValues, unknown, ArtworkDetailInput>({
    resolver: zodResolver(artworkDetailSchema),
    defaultValues: toDefaults(artwork),
  });
  const { errors, isDirty } = form.formState;
  const everPublished = artwork.publishedAt !== null;

  const [title, autoSlug, isFeatured, availability] = useWatch({
    control: form.control,
    name: ["title", "autoSlug", "isFeatured", "availability"],
  });
  const followsTitle = autoSlug && !everPublished;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => updateArtwork(artwork.id, values));
      if (!result.ok) {
        const slugError = result.fieldErrors?.slug?.[0];
        if (slugError) form.setError("slug", { message: slugError });
        toast.error(result.error);
        return;
      }
      toast.success("Karya tersimpan");
      form.reset({ ...form.getValues(), slug: result.data.slug });
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detail karya</CardTitle>
        <CardDescription>Judul, medium, dan tahun wajib diisi sebelum terbit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field id="artwork-title" label="Judul" error={errors.title?.message}>
            <Input id="artwork-title" autoComplete="off" aria-invalid={!!errors.title} {...form.register("title")} />
          </Field>

          <Field
            id="artwork-slug"
            label="Slug URL"
            error={errors.slug?.message}
            hint={
              followsTitle
                ? "Mengikuti judul sampai karya pertama kali terbit. Akhiran -2, -3 ditambahkan jika sudah dipakai."
                : everPublished
                  ? "Jika diubah, tautan lama tetap diarahkan ke slug baru."
                  : "Huruf kecil, angka, dan tanda hubung."
            }
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-sm text-muted-foreground">{routes.gallery.artwork("")}</span>
              <Controller
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <Input
                    id="artwork-slug"
                    ref={field.ref}
                    name={field.name}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0"
                    aria-invalid={!!errors.slug}
                    value={
                      // Mode otomatis: slug tersimpan jika sudah cocok dengan judul (bisa berakhiran -2),
                      // selain itu pratinjau slug dari judul yang sedang diketik.
                      followsTitle && !isAutoSlug(field.value, title ?? "") ? slugify(title ?? "") : field.value
                    }
                    onChange={(e) => {
                      form.setValue("autoSlug", false, { shouldDirty: true });
                      field.onChange(e.target.value);
                    }}
                    onBlur={() => {
                      const raw = field.value.trim();
                      if (!followsTitle && raw) field.onChange(slugify(raw));
                      field.onBlur();
                    }}
                  />
                )}
              />
            </div>
            {!everPublished && !followsTitle && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto justify-self-start px-0"
                onClick={() => {
                  form.setValue("autoSlug", true, { shouldDirty: true });
                  form.clearErrors("slug");
                }}
              >
                Ikuti judul lagi
              </Button>
            )}
          </Field>

          <Field
            id="artwork-summary"
            label="Ringkasan satu kalimat"
            error={errors.summary?.message}
            hint="Tampil di bawah judul dan sebagai deskripsi saat tautan dibagikan."
          >
            <Input
              id="artwork-summary"
              autoComplete="off"
              aria-invalid={!!errors.summary}
              {...form.register("summary")}
            />
          </Field>

          <Field id="artwork-description" label="Cerita / deskripsi" error={errors.description?.message}>
            <Textarea
              id="artwork-description"
              rows={6}
              placeholder="Inspirasi, proses, hal yang ingin diceritakan ke pengunjung…"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="artwork-medium" label="Medium" error={errors.medium?.message}>
              <Controller
                control={form.control}
                name="medium"
                render={({ field, fieldState }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : (v as Medium))}
                  >
                    <SelectTrigger id="artwork-medium" className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Belum dipilih</SelectItem>
                      {MEDIUMS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MEDIUM_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="artwork-year" label="Tahun selesai" error={errors.year?.message}>
              <Input
                id="artwork-year"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder="mis. 2026"
                aria-invalid={!!errors.year}
                {...form.register("year")}
              />
            </Field>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Ukuran (cm)</legend>
            <div className="grid grid-cols-3 gap-2">
              <DimensionInput id="artwork-width" label="Lebar" form={form} name="widthCm" error={errors.widthCm?.message} />
              <DimensionInput id="artwork-height" label="Tinggi" form={form} name="heightCm" error={errors.heightCm?.message} />
              <DimensionInput id="artwork-depth" label="Tebal" form={form} name="depthCm" error={errors.depthCm?.message} />
            </div>
            {[errors.widthCm, errors.heightCm, errors.depthCm].map(
              (e, i) => e?.message && <p key={i} className="text-xs text-destructive">{e.message}</p>,
            )}
            <p className="text-xs text-muted-foreground">Desimal boleh, mis. 12,5. Tebal boleh kosong untuk gambar.</p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field id="artwork-materials" label="Bahan" error={errors.materials?.message}>
              <Input
                id="artwork-materials"
                autoComplete="off"
                placeholder="mis. Clay air dry, cat akrilik"
                aria-invalid={!!errors.materials}
                {...form.register("materials")}
              />
            </Field>
            <Field
              id="artwork-weight"
              label="Berat (gram)"
              error={errors.weightGram?.message}
              hint="Opsional, untuk ongkir nanti."
            >
              <Input
                id="artwork-weight"
                type="number"
                inputMode="numeric"
                min={1}
                aria-invalid={!!errors.weightGram}
                {...form.register("weightGram")}
              />
            </Field>
          </div>

          <Field id="artwork-project" label="Proyek asal" error={errors.projectId?.message}>
            <Controller
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                  <SelectTrigger id="artwork-project" className="w-full">
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Tanpa proyek</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid gap-4 rounded-lg border p-3">
            <Field id="artwork-availability" label="Ketersediaan" error={errors.availability?.message}>
              <Controller
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as Availability)}>
                    <SelectTrigger id="artwork-availability" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITIES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {AVAILABILITY_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              id="artwork-price"
              label="Harga (Rupiah)"
              error={errors.priceIdr?.message}
              hint={
                availability === "NOT_FOR_SALE"
                  ? "Koleksi pribadi: harga tidak pernah tampil di Galeri."
                  : "Angka bulat, mis. 1500000."
              }
            >
              <Input
                id="artwork-price"
                inputMode="numeric"
                autoComplete="off"
                placeholder="mis. 1500000"
                aria-invalid={!!errors.priceIdr}
                {...form.register("priceIdr")}
              />
            </Field>
            <SwitchRow
              id="artwork-show-price"
              label="Tampilkan harga di Galeri"
              description='Jika mati, Galeri menulis "Harga atas permintaan".'
            >
              <Controller
                control={form.control}
                name="showPrice"
                render={({ field }) => (
                  <Switch id="artwork-show-price" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </SwitchRow>
          </div>

          <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-[1fr_10rem] sm:items-start">
            <SwitchRow
              id="artwork-featured"
              label="Unggulan"
              description="Tampil di Beranda Galeri (maks. 8, urutan kecil lebih dulu)."
            >
              <Controller
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <Switch id="artwork-featured" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </SwitchRow>
            <Field id="artwork-featured-order" label="Urutan unggulan" error={errors.featuredOrder?.message}>
              <Input
                id="artwork-featured-order"
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                disabled={!isFeatured}
                aria-invalid={!!errors.featuredOrder}
                {...form.register("featuredOrder")}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !isDirty} className="w-full sm:w-auto">
              {pending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

type DimensionName = "widthCm" | "heightCm" | "depthCm";

function DimensionInput({
  id,
  label,
  name,
  form,
  error,
}: {
  id: string;
  label: string;
  name: DimensionName;
  form: UseFormReturn<ArtworkDetailFormValues, unknown, ArtworkDetailInput>;
  error?: string;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={!!error}
        {...form.register(name)}
      />
    </div>
  );
}
