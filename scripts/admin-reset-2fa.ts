// npm run admin:reset-2fa — reset darurat 2FA (HP hilang dan kode pemulihan habis/hilang).
// Semua sesi dicabut; login berikutnya wajib setup 2FA ulang.

import { PrismaClient } from "@prisma/client";
import { emailSchema } from "../src/features/auth/schema";
import { ask, fail } from "./lib/prompt";

const prisma = new PrismaClient();

async function main() {
  console.log("Reset 2FA akun admin Studio\n");
  const parsed = emailSchema.safeParse(await ask("Email akun: "));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Email tidak valid");

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data } });
  if (!user) fail("Akun tidak ditemukan.");

  const confirm = await ask('Semua sesi akan dicabut dan 2FA harus di-setup ulang. Ketik RESET untuk lanjut: ');
  if (confirm !== "RESET") fail("Dibatalkan.");

  const [, sessions] = await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: { totpSecret: null, totpLastStep: null, recoveryCodeHashes: [] },
    }),
    prisma.session.deleteMany({ where: { adminUserId: user.id } }),
    prisma.loginChallenge.deleteMany({ where: { adminUserId: user.id } }),
  ]);
  console.log(`\n2FA ${user.email} direset, ${sessions.count} sesi dicabut. Login lagi di /masuk untuk setup 2FA.`);
}

main()
  .catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
  .finally(() => prisma.$disconnect());
