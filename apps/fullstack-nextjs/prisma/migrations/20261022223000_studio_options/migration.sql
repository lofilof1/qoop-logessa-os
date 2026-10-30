CREATE TABLE "StudioOption" (
 "id" TEXT NOT NULL,
 "fieldId" TEXT NOT NULL,
 "value" TEXT NOT NULL,
 "normalized" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StudioOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudioOption_fieldId_normalized_key" ON "StudioOption"("fieldId", "normalized");
