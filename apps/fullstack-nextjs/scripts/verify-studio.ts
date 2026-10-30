import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { initialBrief } from "../src/lib/studio";
const db = new PrismaClient();
let id: string | undefined;
try {
  for (const url of [
    "/studio",
    "/lessons/course.pdf",
    "/lessons/collection-1-14.pdf",
  ])
    assert.equal((await fetch("http://localhost:3000" + url)).status, 200);
  const d = initialBrief();
  d.title = "TEST-STUDIO-" + Date.now();
  d.mode = "continuous";
  d.values.primary = "Ağaç";
  d.values.secondary = "Göl";
  d.values.secondaryExtra = "Ördek";
  d.values.collectionRole = "Supporting";
  d.values.colorRole_background = "__other__";
  d.custom.colorRole_background = "#ECE5D3";
  d.values.launchWave = "2. dalga";
  d.values.medium = "__other__";
  d.custom.medium = "Yumuşak guaj ve gravür çizgisi";
  const send = (v: unknown) =>
    fetch("http://localhost:3000/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
  const first = await send(d);
  assert.equal(first.status, 201);
  const record = await first.json();
  id = record.id;
  assert.equal(record.payload.values.secondaryExtra, "Ördek");
  assert.equal(record.payload.values.collectionRole, "Supporting");
  assert.equal(record.payload.custom.colorRole_background, "#ECE5D3");
  assert.equal(record.payload.custom.medium, d.custom.medium);
  const second = await send(d);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).id, id);
  assert.equal((await send({ ...d, cropWidth: 500 })).status, 400);
  assert.equal(
    (
      await send({
        ...d,
        values: { ...d.values, aspect: "__other__" },
        custom: { ...d.custom, aspect: "0:3" },
      })
    ).status,
    400,
  );
  assert.equal(await db.studioBrief.count({ where: { title: d.title } }), 1);
  assert.equal((await fetch("http://localhost:3000/studio")).status, 200);
  console.log(
    "PASS: studio page, source PDF, custom selection persistence, deduplicated save, invalid crop/ratio rejected, reload",
  );
} finally {
  if (id) await db.studioBrief.delete({ where: { id } });
  await db.$disconnect();
}
