import { db } from "@/lib/db";
import { briefSchema, stableBriefJson } from "@/lib/studio";
import { studioPrompts } from "@/lib/provider-prompts";
import { localMutation } from "@/lib/image-connection";
import { failure } from "@/lib/http";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
const schema = z.object({
  brief: briefSchema,
  provider: z.enum(["MIDJOURNEY", "CHATGPT"]),
  produced: z.literal(true),
  sku: z
    .string()
    .trim()
    .regex(/^$|^[A-Z0-9][A-Z0-9-]{2,39}$/)
    .default(""),
  sourceUrl: z
    .string()
    .max(2000)
    .default("")
    .refine((v) => !v || (/^https?:\/\//.test(v) && URL.canParse(v))),
  jobId: z.string().max(200).default(""),
  seed: z.string().max(100).default(""),
});
export async function POST(r: Request) {
  try {
    localMutation(r);
    const d = schema.parse(await r.json());
    const prompts = studioPrompts(d.brief);
    const requestHash = createHash("sha256")
      .update(stableBriefJson({ ...d, prompts, version: "confirmed-v1" }))
      .digest("hex");
    const existing = await db.studioGeneration.findUnique({
      where: { requestHash },
    });
    if (existing?.designId) {
      const design = await db.design.findUniqueOrThrow({
        where: { id: existing.designId },
      });
      return Response.json({ id: design.id, code: design.code, reused: true });
    }
    const code = d.sku || `QOOP-${randomUUID().slice(0, 8).toUpperCase()}`,
      prompt =
        d.provider === "MIDJOURNEY" ? prompts.midjourney : prompts.chatgpt;
    try {
      const design = await db.$transaction(async (tx) => {
        const result = await tx.design.create({
          data: {
            code,
            title: d.brief.title,
            description:
              "Kullanıcı üretildi olarak işaretledi. Görsel dosyası ve baskı kontrolü ayrıca eklenir.",
            skus: { create: { code, label: "Onaylanan üretim" } },
            sources: {
              create: {
                provider: d.provider,
                prompt,
                sourceUrl: d.sourceUrl || null,
                jobId: d.jobId || null,
                seed: d.seed || null,
                raw: {
                  brief: d.brief,
                  prompts,
                  produced: true,
                  confirmedAt: new Date().toISOString(),
                  validation: "USER_ACCEPTED_NOT_PRINT_VALIDATED",
                },
              },
            },
          },
        });
        await tx.studioGeneration.create({
          data: {
            requestHash,
            status: "CONFIRMED",
            prompt,
            model: d.provider,
            size: "external",
            payload: d.brief,
            designId: result.id,
          },
        });
        return result;
      });
      return Response.json(
        { id: design.id, code: design.code, reused: false },
        { status: 201 },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const job = await db.studioGeneration.findUnique({
          where: { requestHash },
        });
        if (job?.designId) {
          const design = await db.design.findUniqueOrThrow({
            where: { id: job.designId },
          });
          return Response.json({
            id: design.id,
            code: design.code,
            reused: true,
          });
        }
      }
      throw e;
    }
  } catch (e) {
    return failure(e);
  }
}
