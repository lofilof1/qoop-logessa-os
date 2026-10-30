-- CreateTable
CREATE TABLE "ResearchFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deferred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ResearchFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReference" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "listingId" TEXT,
    "url" TEXT,
    "imagePath" TEXT,
    "observedAt" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ResearchReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchKeyword" (
    "term" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "focused" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ResearchKeyword_pkey" PRIMARY KEY ("term")
);

-- CreateTable
CREATE TABLE "ResearchPrompt" (
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "legacyFlags" JSONB NOT NULL,

    CONSTRAINT "ResearchPrompt_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceDate" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeImport" (
    "hash" TEXT NOT NULL,
    "snapshotDate" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeImport_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "DesignResearchLink" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "influence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignResearchLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchReference_familyId_purpose_idx" ON "ResearchReference"("familyId", "purpose");

-- CreateIndex
CREATE INDEX "ResearchKeyword_focused_category_idx" ON "ResearchKeyword"("focused", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DesignResearchLink_designId_referenceId_key" ON "DesignResearchLink"("designId", "referenceId");

-- AddForeignKey
ALTER TABLE "ResearchReference" ADD CONSTRAINT "ResearchReference_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ResearchFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPrompt" ADD CONSTRAINT "ResearchPrompt_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ResearchFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignResearchLink" ADD CONSTRAINT "DesignResearchLink_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignResearchLink" ADD CONSTRAINT "DesignResearchLink_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "ResearchReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

