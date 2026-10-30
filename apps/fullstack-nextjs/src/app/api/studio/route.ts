import { db } from "@/lib/db";
import { rememberBriefOptions } from "@/lib/studio-option-store";
import { briefSchema, stableBriefJson } from "@/lib/studio";
import { failure } from "@/lib/http";
import { createHash } from "node:crypto";
import catalog from "../../../../data/lessons/catalog.json";
export async function POST(r: Request) {
  try {
    const data = briefSchema.parse(await r.json());
    await rememberBriefOptions(data);
    const hash = createHash("sha256")
      .update(stableBriefJson(data))
      .digest("hex");
    const prior = await db.studioBrief.findUnique({
      where: { contentHash: hash },
    });
    if (prior) return Response.json({ ...prior, reused: true });
    const record = await db.studioBrief.create({
      data: {
        title: data.title,
        mode: data.mode,
        contentHash: hash,
        sourceHash: catalog.evidenceHash,
        catalogVersion: catalog.version,
        payload: data,
      },
    });
    return Response.json({ ...record, reused: false }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
