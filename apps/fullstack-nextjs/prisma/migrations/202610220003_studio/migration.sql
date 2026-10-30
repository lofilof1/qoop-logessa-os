-- CreateTable
CREATE TABLE "StudioBrief" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "catalogVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioBrief_contentHash_key" ON "StudioBrief"("contentHash");

