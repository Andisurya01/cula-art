import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email terlalu panjang")
  .pipe(z.email({ error: "Format email tidak valid" }));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi").max(PASSWORD_MAX_LENGTH, "Password terlalu panjang"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Kode 2FA 6 digit, atau kode pemulihan `xxxxx-xxxxx`. */
export const secondFactorSchema = z.object({
  code: z.string().trim().min(1, "Masukkan kode").max(32, "Kode tidak valid"),
  next: z.string().max(2048).optional(),
});

export const totpSetupSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Masukkan 6 digit kode dari aplikasi authenticator"),
});

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
  .max(PASSWORD_MAX_LENGTH, `Password maksimal ${PASSWORD_MAX_LENGTH} karakter`);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Isi password saat ini").max(PASSWORD_MAX_LENGTH),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Konfirmasi password tidak sama",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    error: "Password baru harus berbeda dari password saat ini",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const currentPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Isi password saat ini").max(PASSWORD_MAX_LENGTH),
});

export const sessionIdSchema = z.object({ sessionId: z.string().min(1, "Sesi tidak valid") });
