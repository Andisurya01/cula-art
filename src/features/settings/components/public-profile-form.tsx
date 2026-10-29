"use client";

import { useForm, useWatch, type Control, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/lib/routes";
import { instagramUrl, tiktokUrl } from "@/features/gallery/format";
import { updatePublicProfile } from "../actions";
import {
  cleanHandleInput,
  normalizeWhatsappInput,
  PROFILE_LIMITS,
  publicProfileSchema,
  type PublicProfileInput,
  type PublicProfileValues,
} from "../schema";
import { useRunAction } from "./use-run-action";

type FieldName = keyof PublicProfileInput;

/** Nilai form: null → "" supaya input terkendali. */
function toFormValues(profile: PublicProfileValues): PublicProfileInput {
  return {
    siteName: profile.siteName,
    tagline: profile.tagline ?? "",
    bio: profile.bio ?? "",
    aboutText: profile.aboutText ?? "",
    city: profile.city ?? "",
    whatsapp: profile.whatsapp ?? "",
    contactEmail: profile.contactEmail ?? "",
    igHandle: profile.igHandle ?? "",
    tiktokHandle: profile.tiktokHandle ?? "",
  };
}

/** Form profil publik Galeri. Field kosong tidak ditampilkan di Galeri. */
export function PublicProfileForm({ profile }: { profile: PublicProfileValues }) {
  const { pending, run } = useRunAction();
  const form = useForm<PublicProfileInput, unknown, PublicProfileValues>({
    resolver: zodResolver(publicProfileSchema),
    defaultValues: toFormValues(profile),
  });
  const { errors, isDirty } = form.formState;
  const { control, register } = form;

  const onSubmit = form.handleSubmit((values) => {
    run(() => updatePublicProfile(values), {
      success: "Profil publik disimpan",
      // Tampilkan nilai yang benar-benar tersimpan (mis. WhatsApp 0812… → 62812…).
      onOk: () => form.reset(toFormValues(values)),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil publik</CardTitle>
        <CardDescription>
          Tampil di header, Beranda, dan halaman Tentang Galeri. Field yang dikosongkan tidak
          ditampilkan.
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <a href={routes.gallery.about} target="_blank" rel="noopener">
              <ExternalLink />
              Lihat Galeri
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-6">
          <section className="grid gap-4" aria-labelledby="profil-identitas">
            <SectionTitle id="profil-identitas">Identitas</SectionTitle>
            <Field
              id="site-name"
              label="Nama situs"
              hint="Nama di header dan judul tab Galeri."
              error={errors.siteName?.message}
              counter={{ control, name: "siteName", max: PROFILE_LIMITS.siteName }}
            >
              <Input
                id="site-name"
                autoComplete="off"
                maxLength={PROFILE_LIMITS.siteName}
                aria-invalid={!!errors.siteName}
                {...register("siteName")}
              />
            </Field>
            <Field
              id="tagline"
              label="Tagline"
              hint="Satu kalimat di bawah nama, mis. “Gambar dan patung clay dari Bandung”."
              error={errors.tagline?.message}
              counter={{ control, name: "tagline", max: PROFILE_LIMITS.tagline }}
            >
              <Input
                id="tagline"
                autoComplete="off"
                maxLength={PROFILE_LIMITS.tagline}
                aria-invalid={!!errors.tagline}
                {...register("tagline")}
              />
            </Field>
            <Field
              id="bio"
              label="Bio singkat"
              hint="Satu paragraf pendek di Beranda Galeri."
              error={errors.bio?.message}
              counter={{ control, name: "bio", max: PROFILE_LIMITS.bio }}
            >
              <Textarea
                id="bio"
                rows={3}
                maxLength={PROFILE_LIMITS.bio}
                aria-invalid={!!errors.bio}
                {...register("bio")}
              />
            </Field>
            <Field
              id="about-text"
              label="Cerita Tentang"
              hint="Perjalanan belajar menggambar dan clay di halaman Tentang. Pisahkan paragraf dengan baris kosong."
              error={errors.aboutText?.message}
              counter={{ control, name: "aboutText", max: PROFILE_LIMITS.aboutText }}
            >
              <Textarea
                id="about-text"
                rows={8}
                className="min-h-40 max-h-[32rem]"
                maxLength={PROFILE_LIMITS.aboutText}
                aria-invalid={!!errors.aboutText}
                {...register("aboutText")}
              />
            </Field>
          </section>

          <Separator />

          <section className="grid gap-4" aria-labelledby="profil-kontak">
            <SectionTitle id="profil-kontak">Kontak</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="Kota" hint="Opsional, mis. Bandung." error={errors.city?.message}>
                <Input
                  id="city"
                  autoComplete="off"
                  maxLength={PROFILE_LIMITS.city}
                  aria-invalid={!!errors.city}
                  {...register("city")}
                />
              </Field>
              <Field
                id="whatsapp"
                label="WhatsApp"
                hint="Untuk tombol “Tanya karya ini”. Boleh 0812… atau +62 812…, disimpan sebagai 62…"
                error={errors.whatsapp?.message}
                preview={<WhatsappPreview control={control} />}
              >
                <Input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="0812 3456 7890"
                  maxLength={24}
                  aria-invalid={!!errors.whatsapp}
                  {...register("whatsapp")}
                />
              </Field>
              <Field
                id="contact-email"
                label="Email kontak"
                hint="Cadangan jika WhatsApp kosong."
                error={errors.contactEmail?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="contact-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="nama@contoh.com"
                  maxLength={PROFILE_LIMITS.contactEmail}
                  aria-invalid={!!errors.contactEmail}
                  {...register("contactEmail")}
                />
              </Field>
            </div>
          </section>

          <Separator />

          <section className="grid gap-4" aria-labelledby="profil-sosial">
            <div className="grid gap-1">
              <SectionTitle id="profil-sosial">Media sosial</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Ketik nama akun (dengan atau tanpa @) atau tempel tautan profil.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <HandleField
                id="ig-handle"
                label="Instagram"
                error={errors.igHandle?.message}
                inputProps={register("igHandle")}
                preview={<HandlePreview control={control} name="igHandle" toUrl={instagramUrl} />}
              />
              <HandleField
                id="tiktok-handle"
                label="TikTok"
                error={errors.tiktokHandle?.message}
                inputProps={register("tiktokHandle")}
                preview={<HandlePreview control={control} name="tiktokHandle" toUrl={tiktokUrl} />}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Menyimpan…" : "Simpan profil"}
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

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-sm font-medium">
      {children}
    </h3>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  counter,
  preview,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  counter?: { control: Control<PublicProfileInput>; name: FieldName; max: number };
  preview?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {counter && <CharCounter {...counter} />}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {preview}
    </div>
  );
}

function CharCounter({
  control,
  name,
  max,
}: {
  control: Control<PublicProfileInput>;
  name: FieldName;
  max: number;
}) {
  const value = useWatch({ control, name });
  const length = (value ?? "").length;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length > max * 0.9 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {length}/{max}
    </span>
  );
}

function HandleField({
  id,
  label,
  error,
  inputProps,
  preview,
}: {
  id: string;
  label: string;
  error?: string;
  inputProps: UseFormRegisterReturn;
  preview: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground" aria-hidden>
          @
        </span>
        <Input
          id={id}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="namaakun"
          maxLength={80}
          aria-invalid={!!error}
          {...inputProps}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {preview}
    </div>
  );
}

/** Tautan yang akan dipakai Galeri, supaya bisa dicek sebelum disimpan. */
function LinkPreview({ href }: { href: string | null }) {
  if (!href) return null;
  const label = href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <p className="min-w-0 truncate text-xs text-muted-foreground">
      Tautan:{" "}
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
        {label}
      </a>
    </p>
  );
}

function WhatsappPreview({ control }: { control: Control<PublicProfileInput> }) {
  const value = useWatch({ control, name: "whatsapp" });
  const number = normalizeWhatsappInput(value);
  return <LinkPreview href={number ? `https://wa.me/${number}` : null} />;
}

function HandlePreview({
  control,
  name,
  toUrl,
}: {
  control: Control<PublicProfileInput>;
  name: "igHandle" | "tiktokHandle";
  toUrl: (handle: string) => string | null;
}) {
  const value = useWatch({ control, name });
  return <LinkPreview href={toUrl(cleanHandleInput(value))} />;
}
