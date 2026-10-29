// npm run admin:create — buat akun pemilik Studio (satu akun). 2FA di-setup saat login pertama.

import { PrismaClient } from "@prisma/client";
import { emailSchema } from "../src/features/auth/schema";
import { hashPassword, passwordProblem } from "../src/features/auth/password";
import { ask, askNewPassword, fail } from "./lib/prompt";

const prisma = new PrismaClient();

async function main() {
  console.log("Buat akun admin Studio\n");
  const existing = await prisma.adminUser.findFirst({ select: { email: true } });
  if (existing) {
    fail(
      `Akun admin sudah ada (${existing.email}). Studio hanya untuk satu pemilik.\n` +
        "Lupa password: npm run admin:reset-password · HP hilang: npm run admin:reset-2fa",
    );
  }

  const parsed = emailSchema.safeParse(await ask("Email: "));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Email tidak valid");
  const password = await askNewPassword(passwordProblem);

  await prisma.adminUser.create({
    data: { email: parsed.data, passwordHash: await hashPassword(password) },
  });
  console.log(`\nAkun ${parsed.data} dibuat. Buka /masuk, lalu setup 2FA dengan aplikasi authenticator.`);
}

main()
  .catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
  .finally(() => prisma.$disconnect());
