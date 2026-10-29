"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunAction } from "@/features/settings/components/use-run-action";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import {
  changePassword,
  logout,
  logoutEverywhere,
  regenerateRecoveryCodes,
  revokeOtherSessions,
  revokeSession,
} from "../actions";
import type { AccountSecurity as AccountSecurityData } from "../queries";
import { changePasswordSchema, type ChangePasswordInput } from "../schema";
import { RecoveryCodesPanel } from "./recovery-codes-panel";

/** Tab Pengaturan "Akun & keamanan". */
export function AccountSecurity({ data }: { data: AccountSecurityData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <ChangePasswordCard email={data.email} passwordChangedAt={data.passwordChangedAt} />
      <RecoveryCodesCard left={data.recoveryCodesLeft} />
      <SessionsCard sessions={data.sessions} />
      <SignOutCard />
    </div>
  );
}

function ChangePasswordCard({ email, passwordChangedAt }: { email: string; passwordChangedAt: Date }) {
  const { pending, run } = useRunAction();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    run(() => changePassword(values), {
      success: "Password diganti. Sesi di perangkat lain sudah dicabut.",
      onOk: () => form.reset(),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          {email} · diganti {formatWib(passwordChangedAt, "d MMM yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3" noValidate>
          {/* Membantu pengelola password menyimpan pasangan email + password baru. */}
          <input type="text" autoComplete="username" value={email} readOnly hidden />
          <PasswordField
            id="current-password"
            label="Password saat ini"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
          <PasswordField
            id="new-password"
            label="Password baru (min. 12 karakter)"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...form.register("newPassword")}
          />
          <PasswordField
            id="confirm-password"
            label="Ulangi password baru"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />
          <Button type="submit" disabled={pending} className="w-fit">
            Ganti password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  error,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string; error?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" aria-invalid={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RecoveryCodesCard({ left }: { left: number }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() => regenerateRecoveryCodes({ currentPassword: password }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPassword("");
      setCodes(result.data.recoveryCodes);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kode pemulihan 2FA</CardTitle>
        <CardDescription>
          Sisa {left} dari 10 kode. Buat ulang jika hampir habis atau kode lama mungkin bocor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setCodes(null);
              setPassword("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant={left <= 3 ? "default" : "outline"}>Buat ulang kode</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{codes ? "Kode pemulihan baru" : "Buat ulang kode pemulihan"}</DialogTitle>
              <DialogDescription>
                {codes
                  ? "Kode lama sudah tidak berlaku. Simpan kode ini; hanya ditampilkan sekali."
                  : "Semua kode lama tidak berlaku lagi. Masukkan password untuk melanjutkan."}
              </DialogDescription>
            </DialogHeader>
            {codes ? (
              <RecoveryCodesPanel codes={codes} />
            ) : (
              <form onSubmit={onSubmit} className="grid gap-3">
                <input type="text" autoComplete="username" hidden readOnly />
                <PasswordField
                  id="regen-password"
                  label="Password saat ini"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" disabled={pending || !password}>
                  Buat kode baru
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SessionsCard({ sessions }: { sessions: AccountSecurityData["sessions"] }) {
  const { pending, run } = useRunAction();
  const others = sessions.filter((s) => !s.current).length;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Sesi aktif</CardTitle>
        <CardDescription>
          Perangkat yang sedang login. Sesi berlaku 30 hari sejak terakhir dipakai.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ul className="divide-y rounded-lg border">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {s.device}
                  {s.current && <Badge variant="secondary">Perangkat ini</Badge>}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.ip ?? "IP tidak diketahui"} · terakhir dipakai {formatWib(s.lastUsedAt, "d MMM yyyy HH.mm")}{" "}
                  WIB · masuk {formatWib(s.createdAt, "d MMM yyyy")}
                </span>
              </span>
              {!s.current && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => revokeSession({ sessionId: s.id }), { success: "Sesi dicabut" })}
                >
                  Cabut
                </Button>
              )}
            </li>
          ))}
        </ul>
        {others > 0 && (
          <Button
            variant="outline"
            className="w-fit"
            disabled={pending}
            onClick={() => run(() => revokeOtherSessions(), { success: "Sesi lain dicabut" })}
          >
            Cabut {others} sesi lain
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SignOutCard() {
  const [pending, startTransition] = useTransition();

  function onLogout(action: () => Promise<void>) {
    startTransition(async () => {
      // Berhasil → server redirect ke /masuk.
      await callAction(async () => {
        await action();
        return { ok: true, data: undefined };
      });
    });
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Keluar</CardTitle>
        <CardDescription>
          Keluar hanya menutup sesi di perangkat ini. Pakai &quot;Keluar dari semua perangkat&quot; jika HP
          atau laptop hilang.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => onLogout(logout)}>
          <LogOut />
          Keluar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              Keluar dari semua perangkat
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Keluar dari semua perangkat?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua sesi dicabut, termasuk perangkat ini. Kamu perlu login lagi dengan password dan
                kode 2FA.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onLogout(logoutEverywhere)}>
                Keluar semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
