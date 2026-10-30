CREATE TABLE "ImageAnalysis" (
 "id" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "mode" TEXT NOT NULL,
 "focus" TEXT NOT NULL,
 "notes" TEXT NOT NULL,
 "report" TEXT NOT NULL DEFAULT '',
 "key" TEXT NOT NULL,
 "previewKey" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "mime" TEXT NOT NULL,
 "bytes" INTEGER NOT NULL,
 "width" INTEGER NOT NULL,
 "height" INTEGER NOT NULL,
 "sha256" TEXT NOT NULL,
 "wallWidth" DOUBLE PRECISION,
 "wallHeight" DOUBLE PRECISION,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ImageAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ImageAnalysis_key_key" ON "ImageAnalysis"("key");
CREATE UNIQUE INDEX "ImageAnalysis_previewKey_key" ON "ImageAnalysis"("previewKey");
