-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'API');

-- AlterTable
ALTER TABLE "AccountSnapshot" ADD COLUMN     "source" "DataSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "MetricSnapshot" ADD COLUMN     "source" "DataSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_platform_externalId_key" ON "Post"("platform", "externalId");

-- Ditulis manual: schema Prisma 6 tidak bisa menyatakan partial unique index.
-- Satu snapshot H1 dan satu H7 per post; CUSTOM boleh banyak.
-- `prisma migrate diff` tidak melaporkan index ini sebagai perbedaan.
CREATE UNIQUE INDEX "MetricSnapshot_postId_kind_key" ON "MetricSnapshot"("postId", "kind") WHERE "kind" <> 'CUSTOM';
