-- Fase 5 (saran): kolom Eksperimen (platform, varian A/B, concludedAt), rencana konten di WeeklyReview,
-- dan tabel SuggestionDismissal ("Sembunyikan 7 hari"). Dibuat dengan `prisma migrate diff`.
-- Partial unique index MetricSnapshot_postId_kind_key (migrasi 20261105090000_data) tidak disentuh.

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "platform" "Platform" NOT NULL,
ADD COLUMN     "variantA" TEXT NOT NULL,
ADD COLUMN     "variantB" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WeeklyReview" ADD COLUMN     "plannedContentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SuggestionDismissal" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuggestionDismissal_key_key" ON "SuggestionDismissal"("key");

-- CreateIndex
CREATE INDEX "SuggestionDismissal_until_idx" ON "SuggestionDismissal"("until");

-- CreateIndex
CREATE INDEX "Experiment_concludedAt_idx" ON "Experiment"("concludedAt");

-- CreateIndex
CREATE INDEX "ExperimentPost_postId_idx" ON "ExperimentPost"("postId");

