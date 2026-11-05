-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('RUNNING', 'OK', 'ERROR', 'REFUSED');

-- CreateTable
CREATE TABLE "AiGuide" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL DEFAULT 'claude-opus-5-5',
    "voiceJson" TEXT NOT NULL DEFAULT '{}',
    "voiceNotes" TEXT,
    "examplesJson" TEXT NOT NULL DEFAULT '[]',
    "creatorFacts" TEXT,
    "hashtagSetsJson" TEXT NOT NULL DEFAULT '{}',
    "avoidNotes" TEXT,
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "dailyCallLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "status" "AiRunStatus" NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "outputJson" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRun_createdAt_idx" ON "AiRun"("createdAt");

-- CreateIndex
CREATE INDEX "AiRun_feature_model_status_createdAt_idx" ON "AiRun"("feature", "model", "status", "createdAt");

