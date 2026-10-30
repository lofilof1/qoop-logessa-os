ALTER TABLE "Design" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Source" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE TABLE "SourceRevision" (
 "id" TEXT NOT NULL,"sourceId" TEXT NOT NULL,"fingerprint" TEXT NOT NULL,"prompt" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SourceRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SourceRevision_fingerprint_key" ON "SourceRevision"("fingerprint");
CREATE INDEX "SourceRevision_sourceId_createdAt_idx" ON "SourceRevision"("sourceId","createdAt");
ALTER TABLE "SourceRevision" ADD CONSTRAINT "SourceRevision_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
