import { selectAnalysisProvider } from "@/lib/analysis-engine";
import { db } from "@/lib/db";
import { enqueueReview } from "@/lib/analysis-queue";
import { localMutation } from "@/lib/image-connection";
import { analysisInput } from "@/lib/analysis";
import { s3, bucket } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
export const runtime = "nodejs";
export async function POST(r: Request) {
  const keys: string[] = [];
  try {
    localMutation(r);
    const limit = 30 * 1024 * 1024;
    const reader = r.body?.getReader();
    if (!reader) throw Error("Görsel seç.");
    let size = 0;
    const parts: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit + 65536) {
        await reader.cancel();
        return Response.json(
          { error: "En fazla 30 MB görsel yükleyebilirsin." },
          { status: 413 },
        );
      }
      parts.push(value);
    }
    const form = await new Response(Buffer.concat(parts), {
      headers: { "Content-Type": r.headers.get("content-type") || "" },
    }).formData();
    const engine = selectAnalysisProvider(
      form.get("provider"),
      form.get("claudeConsent"),
    );
    const data = analysisInput.parse(Object.fromEntries(form));
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw Error("Görsel seç.");
    if (file.size > limit) throw Error("En fazla 30 MB görsel seç.");
    const body = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(body).digest("hex");
    const existing = await db.imageAnalysis.findFirst({
      where: { sha256, ...data },
    });
    if (existing) {
      let analysisQueued = !!existing.reviewJobId;
      if (true) {
        try {
          await enqueueReview(
            existing.id,
            false,
            engine.provider,
            engine.claudeConsent,
          );
          analysisQueued = true;
        } catch {}
      }
      return Response.json({ id: existing.id, analysisQueued, reused: true });
    }
    const image = sharp(body, { limitInputPixels: 100_000_000 }).rotate();
    const meta = await image.metadata();
    if (!["png", "jpeg", "webp", "tiff"].includes(meta.format || ""))
      throw Error(
        "PNG, JPEG, WebP veya TIFF seç. PSD için önce PNG önizleme dışa aktar.",
      );
    const { data: preview, info } = await image
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    const key = `analysis/${randomUUID()}.${meta.format}`,
      previewKey = key + ".preview.png";
    const swapped = [5, 6, 7, 8].includes(meta.orientation || 1);
    const width = swapped ? meta.height! : meta.width!,
      height = swapped ? meta.width! : meta.height!;
    if (!width || !height || !info.width) throw Error("Görsel okunamadı.");
    for (const [k, b, mime] of [
      [key, body, `image/${meta.format}`],
      [previewKey, preview, "image/png"],
    ] as const) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: k,
          Body: b,
          ContentType: mime,
        }),
      );
      keys.push(k);
    }
    const record = await db.imageAnalysis.create({
      data: {
        ...data,
        key,
        previewKey,
        name: file.name,
        mime: `image/${meta.format}`,
        bytes: body.length,
        width,
        height,
        sha256,
      },
    });
    let analysisQueued = false;
    try {
      await enqueueReview(
        record.id,
        false,
        engine.provider,
        engine.claudeConsent,
      );
      analysisQueued = true;
    } catch {}
    return Response.json({ id: record.id, analysisQueued }, { status: 201 });
  } catch (e) {
    await Promise.allSettled(
      keys.map((Key) =>
        s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key })),
      ),
    );
    return Response.json(
      {
        error:
          e instanceof Error && /seç|yükle|PNG|okunamadı/.test(e.message)
            ? e.message
            : "Görsel kaydedilemedi. Dosyayı ve alanları kontrol et.",
      },
      { status: 400 },
    );
  }
}
