-- Fase 5 (PWA, E10): kunci idempoten ide yang dicatat offline. Kirim ulang dengan offlineId yang sama
-- tidak membuat ide kedua. Dibuat dengan `prisma migrate diff`.

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "offlineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Idea_offlineId_key" ON "Idea"("offlineId");

