CREATE TABLE "RevisionSkuSequence" ("category" TEXT NOT NULL, "lastNumber" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "RevisionSkuSequence_pkey" PRIMARY KEY ("category"));
CREATE TABLE "AnalysisPromptApproval" (
 "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "category" TEXT NOT NULL, "code" TEXT NOT NULL, "designId" TEXT NOT NULL, "provider" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AnalysisPromptApproval_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AnalysisPromptApproval_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ImageAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AnalysisPromptApproval_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AnalysisReviewJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AnalysisPromptApproval_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnalysisPromptApproval_code_key" ON "AnalysisPromptApproval"("code");
CREATE UNIQUE INDEX "AnalysisPromptApproval_designId_key" ON "AnalysisPromptApproval"("designId");
CREATE UNIQUE INDEX "AnalysisPromptApproval_analysisId_jobId_key" ON "AnalysisPromptApproval"("analysisId","jobId");
