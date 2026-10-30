import assert from "node:assert/strict";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const db = new PrismaClient();
const storage = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});
const code = `TEST-${Date.now()}`;
let id: string | undefined;
async function post(path: string, data: unknown) {
  return fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
try {
  assert.equal((await fetch(base + "/api/health")).status, 200);
  const created = await post("/api/designs", { code, title: "Smoke test" });
  assert.equal(created.status, 201);
  id = (await created.json()).id;
  assert.equal(
    (await post("/api/designs", { code, title: "Duplicate" })).status,
    409,
  );
  assert.equal(
    (
      await post("/api/skus", {
        designId: id,
        code: code + "-01",
        label: "Test",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await post(`/api/designs/${id}/sources`, {
        prompt: "Quiet garden",
        seed: "42",
      })
    ).status,
    201,
  );
  for (const format of ["png", "tiff"] as const) {
    const bytes = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#c5d2ab" },
    })
      .toFormat(format)
      .toBuffer();
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(bytes)]), `sample.${format}`);
    const response = await fetch(`${base}/api/designs/${id}/assets`, {
      method: "POST",
      body: form,
    });
    assert.equal(response.status, 201);
    const asset = await response.json();
    assert.equal(asset.width, 32);
    assert.equal(asset.height, 24);
    assert.equal(asset.status, "METADATA_READY");
    const download = await fetch(`${base}/api/assets/${asset.id}`);
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  }
  const psd = Buffer.alloc(26);
  psd.write("8BPS");
  psd.writeUInt16BE(1, 4);
  psd.writeUInt16BE(3, 12);
  psd.writeUInt32BE(24, 14);
  psd.writeUInt32BE(32, 18);
  psd.writeUInt16BE(8, 22);
  psd.writeUInt16BE(3, 24);
  const archive = new FormData();
  archive.set("file", new Blob([psd]), "test.psd");
  const archived = await fetch(`${base}/api/designs/${id}/assets`, {
    method: "POST",
    body: archive,
  });
  assert.equal(archived.status, 201);
  assert.equal((await archived.json()).status, "ARCHIVED");
  const bad = new FormData();
  bad.set("file", new Blob(["fake"]), "fake.png");
  assert.equal(
    (
      await fetch(`${base}/api/designs/${id}/assets`, {
        method: "POST",
        body: bad,
      })
    ).status,
    400,
  );
  for (const path of ["/", "/designs", `/designs/${id}`, "/import"])
    assert.equal((await fetch(base + path)).status, 200);
  assert.equal(
    (
      await fetch(base + "/api/skus", {
        method: "POST",
        headers: {
          Origin: "https://example.com",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  console.log(
    "PASS: health, design, duplicate, SKU, source, PNG/TIFF metadata, PSD archive, download, invalid upload, pages, origin protection",
  );
} finally {
  if (id) {
    const assets = await db.asset.findMany({ where: { designId: id } });
    for (const asset of assets)
      await storage.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: asset.key,
        }),
      );
    await db.design.delete({ where: { id } });
  }
  await db.$disconnect();
}
