CREATE TABLE "TopListingCsvImport" (
 "id" TEXT NOT NULL,"fingerprint" TEXT NOT NULL,"sha" TEXT NOT NULL,"name" TEXT NOT NULL,"query" TEXT NOT NULL,"raw" BYTEA NOT NULL,"headers" JSONB NOT NULL,"rows" JSONB NOT NULL,"market" TEXT NOT NULL DEFAULT 'unknown',"observedAt" TEXT NOT NULL DEFAULT '',"currency" TEXT NOT NULL DEFAULT 'unknown',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TopListingCsvImport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TopListingCsvImport_fingerprint_key" ON "TopListingCsvImport"("fingerprint");
CREATE INDEX "TopListingCsvImport_query_observedAt_idx" ON "TopListingCsvImport"("query","observedAt");
