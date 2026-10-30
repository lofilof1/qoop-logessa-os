ALTER TABLE "ImageAnalysis" ADD COLUMN "reviewJobId" TEXT;
CREATE TABLE "AnalysisReviewJob" (
 "id" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING',
 "input" JSONB NOT NULL,
 "result" JSONB,
 "error" TEXT,
 "usage" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "startedAt" TIMESTAMP(3),
 "finishedAt" TIMESTAMP(3),
 CONSTRAINT "AnalysisReviewJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AnalysisReviewJob_requestHash_key" ON "AnalysisReviewJob"("requestHash");
CREATE INDEX "AnalysisReviewJob_state_createdAt_idx" ON "AnalysisReviewJob"("state", "createdAt");
CREATE TABLE "AnalysisWorkerState" (
 "id" TEXT NOT NULL,
 "ready" BOOLEAN NOT NULL DEFAULT false,
 "heartbeat" TIMESTAMP(3) NOT NULL,
 "message" TEXT NOT NULL,
 CONSTRAINT "AnalysisWorkerState_pkey" PRIMARY KEY ("id")
);
