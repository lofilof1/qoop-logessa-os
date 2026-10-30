import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import { reviewResultSchema } from "@/lib/analysis-review";
import { reviewProviderPrompts } from "@/lib/provider-prompts";
import {
  revisionCategories,
  revisionCode,
  highestCategorySequence,
} from "@/lib/revision-sku";
import { z } from "zod";
import { Prisma } from "@prisma/client";
const schema = z.object({
  approved: z.literal(true),
  jobId: z.string().min(1),
  category: z
    .string()
    .refine((v) => revisionCategories.some((c) => c.code === v)),
  provider: z.enum(["CHATGPT", "MIDJOURNEY"]),
});
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return Response.json(
    await db.analysisPromptApproval.findMany({
      where: { analysisId: id },
      orderBy: { approvedAt: "desc" },
      select: {
        id: true,
        code: true,
        designId: true,
        category: true,
        provider: true,
        jobId: true,
        approvedAt: true,
        design: {select:{deletedAt:true,assets:{orderBy:{createdAt:"desc"},select:{id:true,name:true,format:true,width:true,height:true}}}},
      },
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    localMutation(r);
    const { id } = await params;
    const data = schema.parse(await r.json());
    const outcome = await db.$transaction(
      async (tx) => {
        // Serialize allocation and duplicate approval checks; no model or paid generation is called.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(71405231)`;
        const existing = await tx.analysisPromptApproval.findUnique({
          where: { analysisId_jobId_provider: { analysisId: id, jobId: data.jobId, provider:data.provider } },
        });
        if (existing) return { ...existing, reused: true };
        const a = await tx.imageAnalysis.findUnique({ where: { id } });
        if (!a || a.reviewJobId !== data.jobId)
          throw Error(
            "Analiz değişti. Sayfayı yenileyip güncel promptu kontrol et.",
          );
        const job = await tx.analysisReviewJob.findUnique({
          where: { id: data.jobId },
        });
        if (job?.state !== "SUCCEEDED")
          throw Error("Önce analiz raporu tamamlanmalı.");
        const result = reviewResultSchema.parse(job.result);
        const prompts = reviewProviderPrompts(
          result.correctedPrompt,
          result.negativePrompt,
          `${a.wallWidth || a.width}:${a.wallHeight || a.height}`,
          a.mode,
        );
        const prior = await tx.revisionSkuSequence.upsert({
          where: { category: data.category },
          create: { category: data.category, lastNumber: 0 },
          update: {},
        });
        const [designs, skus] = await Promise.all([
          tx.design.findMany({
            where: { code: { startsWith: data.category + "-" } },
            select: { code: true },
          }),
          tx.sku.findMany({
            where: { code: { startsWith: data.category + "-" } },
            select: { code: true },
          }),
        ]);
        const next =
          Math.max(
            prior.lastNumber,
            highestCategorySequence(
              data.category,
              [...designs, ...skus].map((d) => d.code),
            ),
          ) + 1;
        const code = revisionCode(data.category, next);
        await tx.revisionSkuSequence.update({
          where: { category: data.category },
          data: { lastNumber: next },
        });
        const prompt =
          data.provider === "CHATGPT" ? prompts.chatgpt : prompts.midjourney;
        const approvedAt = new Date();
        const snapshot = {
          analysisId: id,
          reviewJobId: job.id,
          category: data.category,
          generator: data.provider,
          sourceImageHash: a.sha256,
          sourceImageKey: a.key,
          sourceTitle: a.title,
          sourceMode: a.mode,
          notes: a.notes,
          wallWidth: a.wallWidth,
          wallHeight: a.wallHeight,
          report: result,
          previousNotes: a.report,
          prompts,
          approvedAt: approvedAt.toISOString(),
          stage: "PROMPT_APPROVED_AWAITING_IMAGE",
          produced: false,
        };
        const design = await tx.design.create({
          data: {
            code,
            title: `${a.title} · ${data.provider === "CHATGPT" ? "ChatGPT" : "Midjourney"} · Düzenleme`,
            description:
              "Düzeltme promptu onaylandı; yeni görsel dosyası bekleniyor. Üretim ve baskı onayı ayrıca yapılır.",
            skus: {
              create: {
                code,
                label: "Düzenleme · onaylı prompt, görsel bekleniyor",
              },
            },
            sources: {
              create: { provider: data.provider, prompt, raw: snapshot },
            },
          },
        });
        const approval = await tx.analysisPromptApproval.create({
          data: {
            analysisId: id,
            jobId: job.id,
            category: data.category,
            code,
            designId: design.id,
            provider: data.provider,
            snapshot,
            approvedAt,
          },
        });
        return { ...approval, reused: false };
      },
      { timeout: 15000 },
    );
    return Response.json(
      {
        id: outcome.id,
        code: outcome.code,
        designId: outcome.designId,
        category: outcome.category,
        provider: outcome.provider,
        jobId: outcome.jobId,
        approvedAt: outcome.approvedAt,
        reused: outcome.reused,
      },
      { status: outcome.reused ? 200 : 201 },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Prompt onayını, kategoriyi ve üretim aracını kontrol et."
            : e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === "P2002"
              ? "Kod başka bir kayda alındı. Tekrar onaylamayı dene."
              : e instanceof Error &&
                  /Analiz değişti|Önce analiz/.test(e.message)
                ? e.message
                : "Prompt onayı kaydedilemedi. Servisleri kontrol et.",
      },
      { status: 400 },
    );
  }
}
