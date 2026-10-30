CREATE TABLE "ListingDraft" (
 "id" TEXT NOT NULL, "sku" TEXT NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "material" TEXT NOT NULL DEFAULT '', "imageKey" TEXT NOT NULL, "imageHash" TEXT NOT NULL, "jobId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ListingDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingDraft_sku_idx" ON "ListingDraft"("sku");
