// npm run admin:reset-password — atur password baru dari server jika lupa. Semua sesi dicabut;
// 2FA tetap aktif.

import { PrismaClient } from "@prisma/client";
import { emailSchema } from "../src/features/auth/schema";
import { hashPassword, passwordProblem } from "../src/features/auth/password";
import { ask, askNewPassword, fail } from "./lib/prompt";

const prisma = new PrismaClient();

async function main() {
  console.log("Reset password akun admin Studio\n");
  const parsed = emailSchema.safeParse(await ask("Email akun: "));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Email tidak valid");

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data } });
  if (!user) fail("Akun tidak ditemukan.");

  const password = await askNewPassword(passwordProblem);
  const [, sessions] = await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { adminUserId: user.id } }),
    prisma.loginChallenge.deleteMany({ where: { adminUserId: user.id } }),
  ]);
  console.log(`\nPassword ${user.email} diganti, ${sessions.count} sesi dicabut.`);
}

main()
  .catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
  .finally(() => prisma.$disconnect());
