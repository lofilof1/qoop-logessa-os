-- Preserve all existing approvals while allowing one approval per generator.
CREATE UNIQUE INDEX "AnalysisPromptApproval_analysisId_jobId_provider_key" ON "AnalysisPromptApproval"("analysisId", "jobId", "provider");
DROP INDEX "AnalysisPromptApproval_analysisId_jobId_key";
