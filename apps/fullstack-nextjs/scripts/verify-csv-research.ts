import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { csvTable } from "../src/lib/csv-research";
import { csvListingEvidence } from "../src/lib/csv-listing-evidence";
const db = new PrismaClient();
const id = crypto.randomUUID(),
  term = `qoop smoke ${id} forest mural`,
  header = `Keyword,Searches,Competition,Month,Country,CTR,smoke_${id}`;
const source = `${header}\n${term},100,1000,2026-07,US,120,x\n${term},120,1000,2026-08,US,120,x\n${term},180,1000,2026-09,US,120,x`;
const settings = {
  market: "US",
  definition: "monthly",
  period: "",
  observedAt: "2026-09-30",
  source: "erank-keyword",
  numberFormat: "en",
};
const signatures = new Set<string>();
const batchIds: string[] = [];
async function upload(
  mode: string,
  contents: string,
  name = "smoke.csv",
  extra: Record<string, unknown> = {},
  flags: Record<string, string> = {},
) {
  signatures.add(csvTable(contents).signature);
  const f = new FormData();
  f.append("files", new File([contents], name, { type: "text/csv" }));
  f.set("mode", mode);
  f.set("settings", JSON.stringify([{ ...settings, ...extra }]));
  for (const [k, v] of Object.entries(flags)) f.set(k, v);
  const r = await fetch("http://localhost:3000/api/listing/csv", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
    body: f,
  });
  return { status: r.status, body: await r.json() };
}
try {
  const inspected = await upload("inspect", source);
  assert.equal(inspected.status, 200);
  assert.equal(inspected.body.files[0].total, 3);
  const preview = await upload("preview", source);
  assert.equal(preview.body.files[0].stats.newRows, 3);
  const commit = await upload("commit", source);
  assert.equal(commit.status, 200, JSON.stringify(commit.body));
  batchIds.push(commit.body.files[0].id);
  const repeated = await upload("commit", source, "different-name.csv");
  assert.equal(repeated.body.files[0].reused, true);
  assert.equal(await db.keywordCsvObservation.count({ where: { term } }), 3);
  const raw = await (
    await fetch(
      `http://localhost:3000/api/listing/csv?download=${preview.body.files[0].sha}`,
    )
  ).text();
  assert.equal(raw, source);
  const endpoint = `http://localhost:3000/api/listing/csv?market=US&q=${encodeURIComponent(term)}`;
  let report = (await (await fetch(endpoint)).json()).report;
  assert.equal(
    report.changes.find((c: { metric: string }) => c.metric === "searches")
      .percent,
    50,
  );
  const changed = `${header}\n${term},210,1000,2026-09,US,120,x`;
  const changedPreview = await upload("preview", changed);
  assert.equal(changedPreview.body.files[0].stats.revisions, 1);
  assert.equal((await upload("commit", changed)).status, 400);
  const accepted = await upload(
    "commit",
    changed,
    "correction.csv",
    {},
    { acceptRevisions: "true" },
  );
  assert.equal(accepted.status, 200);
  batchIds.push(accepted.body.files[0].id);
  assert.equal(await db.keywordCsvObservation.count({ where: { term } }), 4);
  report = (await (await fetch(endpoint)).json()).report;
  assert.equal(
    report.changes.find((c: { metric: string }) => c.metric === "searches")
      .after,
    210,
  );
  const mixed = `${header}\n${term},300,1000,2026-06,US,120,x\n${term},bad,1000,2026-05,US,120,x`;
  const bad = await upload("preview", mixed);
  assert.equal(bad.body.files[0].stats.invalid, 1);
  assert.equal((await upload("commit", mixed)).status, 400);
  const partial = await upload(
    "commit",
    mixed,
    "partial.csv",
    {},
    { allowPartial: "true" },
  );
  assert.equal(partial.status, 200);
  batchIds.push(partial.body.files[0].id);
  const rolling = `${header}\n${term},777,<20,2026-09,US,120,x`;
  const rollingCommit = await upload("commit", rolling, "rolling.csv", {
    definition: "rolling12",
  });
  assert.equal(rollingCommit.status, 200);
  batchIds.push(rollingCommit.body.files[0].id);
  const listing = await csvListingEvidence([]);
  assert.equal(
    (listing.find((r) => r.term === term)?.data as { aylik_arama: string })
      .aylik_arama,
    "777",
  );
  const result = {
    inspect: true,
    preview: true,
    commit: true,
    repeatedFilenameSkipped: true,
    originalBytes: true,
    monthlyChange: true,
    revisionPreserved: true,
    partialExplicit: true,
    listingEvidence: true,
  };
  await mkdir(".runtime", { recursive: true });
  await writeFile(
    ".runtime/csv-smoke-result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  const own = await db.keywordCsvBatch.findMany({
    where: { observations: { some: { term } } },
    select: { id: true, fileSha: true },
  });
  await db.keywordCsvObservation.deleteMany({ where: { term } });
  await db.keywordCsvBatch.deleteMany({
    where: { id: { in: own.map((b) => b.id) } },
  });
  await db.keywordCsvFile.deleteMany({
    where: { sha: { in: own.map((b) => b.fileSha) }, batches: { none: {} } },
  });
  await db.keywordCsvProfile.deleteMany({
    where: { signature: { in: [...signatures] } },
  });
  await db.$disconnect();
}
