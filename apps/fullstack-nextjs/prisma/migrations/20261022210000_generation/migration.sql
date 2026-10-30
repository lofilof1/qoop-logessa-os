CREATE TABLE "StudioGeneration" (
 "id" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RUNNING',
 "prompt" TEXT NOT NULL,
 "model" TEXT NOT NULL,
 "size" TEXT NOT NULL,
 "payload" JSONB NOT NULL,
 "designId" TEXT,
 "assetId" TEXT,
 "error" TEXT,
 "usage" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StudioGeneration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudioGeneration_requestHash_key" ON "StudioGeneration"("requestHash");
