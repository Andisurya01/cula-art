-- CreateEnum
CREATE TYPE "ArtworkVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('NOT_FOR_SALE', 'AVAILABLE', 'RESERVED', 'SOLD');

-- AlterTable
ALTER TABLE "ProjectPhoto" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "avatarKey" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "siteName" TEXT NOT NULL DEFAULT 'Galeri & Studio Karya',
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "medium" "Medium",
    "year" INTEGER,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "depthCm" DOUBLE PRECISION,
    "materials" TEXT,
    "weightGram" INTEGER,
    "projectId" TEXT,
    "visibility" "ArtworkVisibility" NOT NULL DEFAULT 'DRAFT',
    "availability" "Availability" NOT NULL DEFAULT 'NOT_FOR_SALE',
    "priceIdr" INTEGER,
    "showPrice" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkImage" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "isProcess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkContent" (
    "artworkId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtworkContent_pkey" PRIMARY KEY ("artworkId","contentId")
);

-- CreateTable
CREATE TABLE "ArtworkSlugRedirect" (
    "oldSlug" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtworkSlugRedirect_pkey" PRIMARY KEY ("oldSlug")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artwork_slug_key" ON "Artwork"("slug");

-- CreateIndex
CREATE INDEX "Artwork_visibility_publishedAt_idx" ON "Artwork"("visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "Artwork_visibility_isFeatured_featuredOrder_idx" ON "Artwork"("visibility", "isFeatured", "featuredOrder");

-- CreateIndex
CREATE INDEX "Artwork_projectId_idx" ON "Artwork"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkImage_storageKey_key" ON "ArtworkImage"("storageKey");

-- CreateIndex
CREATE INDEX "ArtworkImage_artworkId_order_idx" ON "ArtworkImage"("artworkId", "order");

-- CreateIndex
CREATE INDEX "ArtworkContent_contentId_idx" ON "ArtworkContent"("contentId");

-- CreateIndex
CREATE INDEX "ArtworkSlugRedirect_artworkId_idx" ON "ArtworkSlugRedirect"("artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPhoto_storageKey_key" ON "ProjectPhoto"("storageKey");

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkImage" ADD CONSTRAINT "ArtworkImage_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkContent" ADD CONSTRAINT "ArtworkContent_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkContent" ADD CONSTRAINT "ArtworkContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkSlugRedirect" ADD CONSTRAINT "ArtworkSlugRedirect_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Foto progres selalu punya sumber: URL lama atau file unggahan.
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_source_check" CHECK ("url" IS NOT NULL OR "storageKey" IS NOT NULL);
