import { db } from "@/lib/db";
import { briefSchema, stableBriefJson } from "@/lib/studio";
import { productionPrompt, generationSize } from "@/lib/studio-production";
import {
  imageKey,
  imageModel,
  localMutation,
  providerMessage,
} from "@/lib/image-connection";
import { bucket, s3 } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import sharp from "sharp";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 240;
const schema = z.object({ brief: briefSchema, variant: z.string().uuid() });
const publicJob = (job: {
  id: string;
  status: string;
  prompt: string;
  size: string;
  designId: string | null;
  assetId: string | null;
  error: string | null;
  createdAt: Date;
}) => ({
  id: job.id,
  status: job.status,
  prompt: job.prompt,
  size: job.size,
  designId: job.designId,
  assetId: job.assetId,
  error: job.error,
  createdAt: job.createdAt,
});
export async function GET() {
  try {
    await db.studioGeneration.updateMany({
      where: {
        status: "RUNNING",
        createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      data: {
        status: "UNCERTAIN",
        error:
          "Sonuç zamanında doğrulanamadı. Yeni ücret oluşmaması için otomatik tekrar yapılmadı; OpenAI kullanımını kontrol et.",
      },
    });
    return Response.json(
      (
        await db.studioGeneration.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      ).map(publicJob),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Üretim geçmişi okunamadı." },
      { status: 500 },
    );
  }
}
export async function POST(r: Request) {
  let jobId: string | undefined;
  let requested = false;
  try {
    localMutation(r);
    const { brief, variant } = schema.parse(await r.json());
    if (brief.mode === "edit")
      return Response.json(
        {
          error:
            "Bu düğme yeni görsel üretir. Mevcut görseli düzenlemek için kaynak görsel bağlantısı gerekir; şimdilik Mural veya Pattern modunu seç.",
        },
        { status: 400 },
      );
    const prompt = productionPrompt(brief),
      size = generationSize(brief);
    const requestHash = createHash("sha256")
      .update(
        stableBriefJson({ brief, variant, prompt, size, model: imageModel }),
      )
      .digest("hex");
    const prior = await db.studioGeneration.findUnique({
      where: { requestHash },
    });
    if (prior) return Response.json({ ...publicJob(prior), reused: true });
    const key = await imageKey();
    if (!key)
      return Response.json(
        { error: "Önce OpenAI bağlantı alanından API anahtarını kaydet." },
        { status: 503 },
      );
    let job;
    try {
      job = await db.studioGeneration.create({
        data: { requestHash, prompt, size, model: imageModel, payload: brief },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const existing = await db.studioGeneration.findUniqueOrThrow({
          where: { requestHash },
        });
        return Response.json({ ...publicJob(existing), reused: true });
      }
      throw e;
    }
    jobId = job.id;
    requested = true;
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: imageModel,
          prompt,
          n: 1,
          size,
          quality: "medium",
          output_format: "png",
        }),
        signal: AbortSignal.timeout(180000),
      },
    );
    if (!response.ok) {
      const error = providerMessage(response.status);
      const failed = await db.studioGeneration.update({
        where: { id: job.id },
        data: { status: "FAILED", error },
      });
      return Response.json(publicJob(failed));
    }
    const output = await response.json();
    const encoded = output.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || encoded.length > 70_000_000)
      throw new Error("invalid image response");
    let bytes = Buffer.from(encoded, "base64");
    if (brief.mode === "pattern") {
      const source = await sharp(bytes, {
        limitInputPixels: 40_000_000,
      }).metadata();
      if (source.format !== "png" || source.width !== source.height)
        throw Error("Pattern çıktısı kare PNG olmalı.");
      bytes = await sharp(bytes, { limitInputPixels: 40_000_000 })
        .resize(1000, 1000, { fit: "fill" })
        .png()
        .toBuffer();
    }
    const metadata = await sharp(bytes, {
      limitInputPixels: 40_000_000,
    }).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height)
      throw new Error("invalid png");
    const keyPath = `generated/${job.id}.png`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: keyPath,
        Body: bytes,
        ContentType: "image/png",
      }),
    );
    const completed = await db.$transaction(async (tx) => {
      const design = await tx.design.create({
        data: {
          code: `AI-${job.id}`,
          title: brief.title,
          description: "Atölye üretimi; seam ve baskı kontrolü bekliyor.",
          assets: {
            create: {
              name: `${job.id}.png`,
              key: keyPath,
              mime: "image/png",
              bytes: bytes.length,
              sha256: createHash("sha256").update(bytes).digest("hex"),
              width: metadata.width,
              height: metadata.height,
              format: "png",
              status: "REVIEW_REQUIRED",
            },
          },
          sources: {
            create: {
              provider: "OPENAI",
              prompt,
              model: imageModel,
              jobId: job.id,
              raw: {
                brief,
                size,
                ...(brief.mode === "pattern"
                  ? { outputPixels: [1000, 1000] }
                  : {}),
                quality: "medium",
                validation: "NOT_REVIEWED",
              },
            },
          },
        },
        include: { assets: true },
      });
      return tx.studioGeneration.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          assetId: design.assets[0].id,
          designId: design.id,
          usage: output.usage || undefined,
        },
      });
    });
    return Response.json(publicJob(completed));
  } catch (e) {
    if (jobId) {
      const error = requested
        ? "İstek gönderildi ancak sonuç doğrulanamadı. Yeniden ücretlenmemek için otomatik tekrar yapılmadı. OpenAI kullanımını kontrol et."
        : "Üretim başlatılamadı.";
      await db.studioGeneration
        .update({ where: { id: jobId }, data: { status: "UNCERTAIN", error } })
        .catch(() => {});
      return Response.json(
        { error, status: "UNCERTAIN", id: jobId },
        { status: 502 },
      );
    }
    if (e instanceof z.ZodError)
      return Response.json(
        { error: e.issues.map((x) => x.message).join(" ") },
        { status: 400 },
      );
    return Response.json(
      {
        error:
          e instanceof Error && e.message.includes("oran")
            ? e.message
            : "Üretim başlatılamadı. Seçimleri ve bağlantıyı kontrol et.",
      },
      { status: 400 },
    );
  }
}
