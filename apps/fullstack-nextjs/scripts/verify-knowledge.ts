import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const db = new PrismaClient();
const data = JSON.parse(
  await readFile(
    new URL("../data/knowledge/dataset.json", import.meta.url),
    "utf8",
  ),
);
let id: string | undefined;
try {
  assert.equal(await db.researchReference.count(), data.references.length);
  assert.equal(await db.researchKeyword.count(), data.keywords.length);
  assert.equal(await db.researchPrompt.count(), 10);
  assert.equal(
    await db.researchPrompt.count({ where: { code: "CH-007", used: true } }),
    1,
  );
  for (const url of [
    "/research",
    "/research?tab=keywords&q=botanical",
    "/research?tab=prompts",
    "/research?family=BT",
  ])
    assert.equal((await fetch("http://localhost:3000" + url)).status, 200);
  const ref = await db.researchReference.findFirstOrThrow({
    where: { imagePath: { not: null } },
  });
  assert.equal(
    (
      await fetch(
        "http://localhost:3000/research/" + encodeURIComponent(ref.id),
      )
    ).status,
    200,
  );
  assert.equal(
    (await fetch("http://localhost:3000" + ref.imagePath)).status,
    200,
  );
  const d = await db.design.create({
    data: { code: "TEST-KNOW-" + Date.now(), title: "Knowledge smoke fixture" },
  });
  id = d.id;
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await fetch("http://localhost:3000/api/research/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designId: id,
            referenceId: ref.id,
            influence: "palette",
          }),
        })
      ).status,
      200,
    );
  assert.equal(
    await db.designResearchLink.count({ where: { designId: id } }),
    1,
  );
  console.log(
    "PASS: imported counts, historical usage, research pages, image, idempotent reference linking",
  );
} finally {
  if (id) await db.design.delete({ where: { id } });
  await db.$disconnect();
}
