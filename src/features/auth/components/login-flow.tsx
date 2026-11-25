"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, KeyRound, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAction } from "@/lib/action-client";
import { safeNextPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { cancelLogin, confirmTotpSetup, submitPassword, submitSecondFactor } from "../login-actions";
import { loginSchema, type LoginInput } from "../schema";
import { RecoveryCodesPanel } from "./recovery-codes-panel";

type Step =
  | { kind: "password" }
  | { kind: "verify" }
  | { kind: "setup"; qrDataUrl: string; secret: string }
  | { kind: "codes"; recoveryCodes: string[] };

/**
 * Login Studio: email + password, lalu kode 2FA (atau setup 2FA pada login pertama). Tampilan gaya
 * referensi Studio: kartu putih radius besar, penanda langkah berbentuk pil, tombol pil primer.
 */
export function LoginFlow({
  next,
  signedIn,
  className,
}: {
  next?: string;
  signedIn: boolean;
  className?: string;
}) {
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [, startTransition] = useTransition();

  function back() {
    startTransition(async () => {
      await callAction(() => cancelLogin());
      setStep({ kind: "password" });
    });
  }

  return (
    <Card className={cn("w-full gap-6 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]", className)}>
      {!(step.kind === "password" && signedIn) && <StepIndicator step={step.kind} />}
      {step.kind === "password" && signedIn && <SignedInStep next={next} />}
      {step.kind === "password" && !signedIn && (
        <PasswordStep
          onVerify={() => setStep({ kind: "verify" })}
          onSetup={(qrDataUrl, secret) => setStep({ kind: "setup", qrDataUrl, secret })}
        />
      )}
      {step.kind === "verify" && <VerifyStep next={next} onBack={back} />}
      {step.kind === "setup" && (
        <SetupStep
          qrDataUrl={step.qrDataUrl}
          secret={step.secret}
          onBack={back}
          onDone={(recoveryCodes) => setStep({ kind: "codes", recoveryCodes })}
        />
      )}
      {step.kind === "codes" && <CodesStep codes={step.recoveryCodes} next={next} />}
    </Card>
  );
}

/**
 * Dua langkah: (1) password, (2) faktor kedua. Login pertama mengaktifkan 2FA dulu lalu menyimpan kode
 * pemulihan; keduanya masih bagian langkah 2.
 */
function StepIndicator({ step }: { step: Step["kind"] }) {
  const second = step === "setup" || step === "codes" ? "Aktifkan 2FA" : "Kode 2FA";
  const items = [
    { label: "Password", state: step === "password" ? "current" : "done" },
    { label: second, state: step === "password" ? "todo" : step === "codes" ? "done" : "current" },
  ] as const;
  return (
    <ol aria-label="Langkah masuk" className="flex items-center gap-2 px-(--card-spacing)">
      {items.map((item, i) => (
        <li
          key={item.label}
          aria-current={item.state === "current" ? "step" : undefined}
          className={cn("flex min-w-0 items-center gap-2", i > 0 && "flex-1")}
        >
          {i > 0 && <span aria-hidden className="h-px min-w-4 flex-1 bg-border" />}
          <span
            className={cn(
              "inline-flex h-8 min-w-0 items-center gap-2 rounded-button py-1 pr-3 pl-1 text-caption font-medium",
              item.state === "current" ? "bg-primary text-primary-foreground" : "bg-muted",
              item.state === "todo" && "text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full tabular-nums",
                item.state === "current" ? "bg-primary-foreground text-primary" : "bg-card",
              )}
            >
              {item.state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="truncate">{item.label}</span>
            {item.state === "done" && <span className="sr-only">(selesai)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function SignedInStep({ next }: { next?: string }) {
  return (
    <>
      <CardHeader>
        <CardTitle as="h1" className="text-h4">Kamu sudah masuk</CardTitle>
        <CardDescription>Sesi di perangkat ini masih aktif.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="lg" arrow className="w-full">
          <Link href={safeNextPath(next)}>Buka Studio</Link>
        </Button>
      </CardContent>
    </>
  );
}

function PasswordStep({
  onVerify,
  onSetup,
}: {
  onVerify: () => void;
  onSetup: (qrDataUrl: string, secret: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await callAction(() => submitPassword(values));
      if (!result.ok) {
        setError(result.error);
        form.setValue("password", "");
        return;
      }
      if (result.data.step === "verify") onVerify();
      else onSetup(result.data.qrDataUrl, result.data.secret);
    });
  });

  return (
    <>
      <CardHeader>
        <CardTitle as="h1" className="text-h4">Masuk ke Studio</CardTitle>
        <CardDescription>Khusus pemilik. Galeri publik tidak perlu login.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormError message={error} />
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {errors.email && <p className="text-caption text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password && <p className="text-caption text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
            {pending ? "Memeriksa…" : "Lanjut"}
          </Button>
        </form>
      </CardContent>
    </>
  );
}

function VerifyStep({ next, onBack }: { next?: string; onBack: () => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Masukkan kode");
      return;
    }
    setError(null);
    startTransition(async () => {
      // Berhasil → server redirect ke Studio; di sini hanya menangani kegagalan.
      const result = await callAction(() => submitSecondFactor({ code, next }));
      if (!result.ok) {
        setError(result.error);
        setCode("");
      }
    });
  }

  return (
    <>
      <CardHeader>
        <CardTitle as="h1" className="flex items-center gap-2 text-h4">
          <ShieldCheck className="size-5 shrink-0" aria-hidden />
          Verifikasi 2 langkah
        </CardTitle>
        <CardDescription>
          {useRecovery
            ? "Masukkan salah satu kode pemulihan. Setiap kode hanya bisa dipakai sekali."
            : "Buka aplikasi authenticator di HP, lalu masukkan 6 digit kode untuk Studio Karya."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormError message={error} />
          <div className="grid gap-2">
            <Label htmlFor="code">{useRecovery ? "Kode pemulihan" : "Kode 2FA"}</Label>
            <Input
              id="code"
              key={useRecovery ? "recovery" : "totp"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="one-time-code"
              inputMode={useRecovery ? "text" : "numeric"}
              placeholder={useRecovery ? "xxxxx-xxxxx" : "123456"}
              maxLength={useRecovery ? 16 : 6}
              className="h-12 text-center font-mono text-body-lg tracking-widest md:text-body-lg"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
            {pending ? "Memeriksa…" : "Masuk"}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Button type="button" variant="ghost" className="-ml-3 h-10" onClick={onBack}>
              <ArrowLeft />
              Kembali
            </Button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-button px-1 text-muted-foreground underline underline-offset-4 outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
              onClick={() => {
                setUseRecovery((v) => !v);
                setCode("");
                setError(null);
              }}
            >
              {useRecovery ? "Pakai kode authenticator" : "Pakai kode pemulihan"}
            </button>
          </div>
        </form>
      </CardContent>
    </>
  );
}

function SetupStep({
  qrDataUrl,
  secret,
  onBack,
  onDone,
}: {
  qrDataUrl: string;
  secret: string;
  onBack: () => void;
  onDone: (codes: string[]) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await callAction(() => confirmTotpSetup({ code }));
      if (!result.ok) {
        setError(result.error);
        setCode("");
        return;
      }
      onDone(result.data.recoveryCodes);
    });
  }

  return (
    <>
      <CardHeader>
        <CardTitle as="h1" className="flex items-center gap-2 text-h4">
          <KeyRound className="size-5 shrink-0" aria-hidden />
          Aktifkan 2FA
        </CardTitle>
        <CardDescription>
          Wajib sekali di login pertama. Pakai Google Authenticator, Microsoft Authenticator, atau
          aplikasi sejenis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
            <li>Di aplikasi authenticator, pilih tambah akun lalu pindai QR ini.</li>
            <li>Tidak bisa memindai? Masukkan kunci di bawah secara manual.</li>
            <li>Ketik 6 digit kode yang muncul di aplikasi.</li>
          </ol>
          {/* QR butuh latar terang di kedua mode supaya bisa dipindai: bg-media-foreground selalu terang. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, bukan gambar yang dioptimasi */}
          <img
            src={qrDataUrl}
            alt="QR untuk aplikasi authenticator"
            width={200}
            height={200}
            className="mx-auto block rounded-card-nested bg-media-foreground p-3"
          />
          <div className="rounded-card-nested bg-muted px-4 py-3 text-center">
            <p className="type-label text-muted-foreground">Kunci manual</p>
            <p className="mt-1 font-mono text-sm break-all select-all">{secret}</p>
          </div>
          <FormError message={error} />
          <div className="grid gap-2">
            <Label htmlFor="setup-code">Kode dari aplikasi</Label>
            <Input
              id="setup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              className="h-12 text-center font-mono text-body-lg tracking-widest md:text-body-lg"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending || code.trim().length !== 6} className="w-full">
            {pending ? "Memeriksa…" : "Aktifkan"}
          </Button>
          <Button type="button" variant="ghost" className="-ml-3 h-10 w-fit" onClick={onBack}>
            <ArrowLeft />
            Kembali
          </Button>
        </form>
      </CardContent>
    </>
  );
}

function CodesStep({ codes, next }: { codes: string[]; next?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  return (
    <>
      <CardHeader>
        <CardTitle as="h1" className="text-h4">Simpan kode pemulihan</CardTitle>
        <CardDescription>
          Dipakai jika HP hilang. Kode ini hanya ditampilkan sekali; simpan di pengelola password atau
          cetak.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RecoveryCodesPanel codes={codes} />
        <div className="flex items-start gap-3 rounded-card-nested bg-muted px-4 py-3">
          <Checkbox
            id="recovery-codes-saved"
            className="mt-0.5 bg-card"
            checked={saved}
            onCheckedChange={(checked) => setSaved(checked === true)}
          />
          <Label htmlFor="recovery-codes-saved" className="leading-snug font-normal">
            Saya sudah menyimpan kode ini di tempat aman.
          </Label>
        </div>
        <Button
          size="lg"
          arrow
          className="w-full"
          disabled={!saved}
          onClick={() => {
            router.replace(safeNextPath(next));
            router.refresh();
          }}
        >
          Lanjut ke Studio
        </Button>
      </CardContent>
    </>
  );
}
