import { db } from "../src/lib/db";
import { s3, bucket } from "../src/lib/storage";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { mkdir, writeFile, rename } from "node:fs/promises";
try {
  const [designs, skus, approvals, assets, analyses, listings] =
    await Promise.all([
      db.design.count(),
      db.sku.count(),
      db.analysisPromptApproval.count(),
      db.asset.findMany({ select: { key: true } }),
      db.imageAnalysis.findMany({ select: { key: true, previewKey: true } }),
      db.listingDraft.findMany({ select: { imageKey: true } }),
    ]);
  const expected = new Set([
    ...assets.map((a) => a.key),
    ...analyses.flatMap((a) => [a.key, a.previewKey]),
    ...listings.map((l) => l.imageKey),
  ]);
  const existing = new Set<string>();
  let bytes = 0,
    token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const o of page.Contents || []) {
      if (o.Key) existing.add(o.Key);
      bytes += o.Size || 0;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  const missing = [...expected].filter((k) => !existing.has(k)),
    unreferenced = [...existing].filter((k) => !expected.has(k));
  const report = {
    checkedAt: new Date().toISOString(),
    readOnly: true,
    records: {
      designs,
      skus,
      approvals,
      assets: assets.length,
      analyses: analyses.length,
      listings: listings.length,
    },
    storage: {
      objects: existing.size,
      bytes,
      missing: missing.length,
      unreferenced: unreferenced.length,
      missingExamples: missing.slice(0, 20),
      unreferencedExamples: unreferenced.slice(0, 20),
    },
    note: "Unreferenced objects are findings only; nothing is deleted. A running upload can temporarily be unreferenced.",
  };
  await mkdir(".runtime", { recursive: true, mode: 0o700 });
  await writeFile(
    ".runtime/system-audit.tmp.json",
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  await rename(".runtime/system-audit.tmp.json", ".runtime/system-audit.json");
  console.log(JSON.stringify(report, null, 2));
  if (missing.length) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
