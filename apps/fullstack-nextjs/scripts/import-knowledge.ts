import { PrismaClient, Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
const db = new PrismaClient();
const data = JSON.parse(
  await readFile(
    new URL("../data/knowledge/dataset.json", import.meta.url),
    "utf8",
  ),
);
try {
  const prior = await db.knowledgeImport.findUnique({
    where: { hash: data.manifest.datasetHash },
  });
  if (prior) {
    console.log("UNCHANGED: same dataset; no imports or model calls");
  } else {
    await db.$transaction(
      async (tx) => {
        for (const family of data.families)
          await tx.researchFamily.upsert({
            where: { id: family.id },
            create: family,
            update: family,
          });
        for (const ref of data.references)
          await tx.researchReference.upsert({
            where: { id: ref.id },
            create: ref,
            update: ref,
          });
        for (let i = 0; i < data.keywords.length; i += 500) {
          const chunk = data.keywords.slice(i, i + 500);
          // Upsert source metrics in batches; local edits aren't stored on source records.
          await tx.$executeRaw(
            Prisma.sql`INSERT INTO "ResearchKeyword" ("term","category","focused","data") SELECT x->>'term',x->>'category',(x->>'focused')::boolean,x->'data' FROM jsonb_array_elements(${JSON.stringify(chunk)}::jsonb) x ON CONFLICT ("term") DO UPDATE SET "category"=EXCLUDED."category","focused"=EXCLUDED."focused","data"=EXCLUDED."data"`,
          );
        }
        for (const prompt of data.prompts)
          await tx.researchPrompt.upsert({
            where: { code: prompt.code },
            create: prompt,
            update: prompt,
          });
        for (const doc of data.documents)
          await tx.knowledgeDocument.upsert({
            where: { id: doc.id },
            create: doc,
            update: doc,
          });
        await tx.knowledgeImport.create({
          data: {
            hash: data.manifest.datasetHash,
            snapshotDate: data.manifest.snapshotDate,
            manifest: data.manifest,
          },
        });
      },
      { timeout: 120000 },
    );
    console.log(JSON.stringify(data.manifest.counts));
  }
} finally {
  await db.$disconnect();
}
