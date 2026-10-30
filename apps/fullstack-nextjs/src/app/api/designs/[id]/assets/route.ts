import {ensureVariantName} from "@/lib/variant-record";
import {archiveDesign} from "@/lib/design-archive";
import {localMutation} from "@/lib/image-connection";
import { db } from "@/lib/db";
import { s3, bucket } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { detectFormat } from "@/lib/validation";
import { failure } from "@/lib/http";
import { createHash, randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
export const runtime = "nodejs";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    localMutation(r);
    const { id } = await params;
    const design=await db.design.findUnique({where:{id}});
    if (!design||design.deletedAt)
      return Response.json({ error: "Tasarım bulunamadı" }, { status: 404 });
    const limit = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;
    if (Number(r.headers.get("content-length")) > limit + 65536)
      return Response.json(
        { error: "Dosya boyutu sınırı aşıldı" },
        { status: 413 },
      );
    const reader = r.body?.getReader();
    if (!reader)
      return Response.json({ error: "Dosya seçin" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit + 65536) {
        await reader.cancel();
        return Response.json(
          { error: "Dosya boyutu sınırı aşıldı" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const payload = Buffer.concat(chunks);
    const form = await new Response(payload, {
      headers: { "Content-Type": r.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size)
      return Response.json({ error: "Dosya seçin" }, { status: 400 });
    if (file.size > limit)
      return Response.json(
        { error: "Dosya boyutu sınırı aşıldı" },
        { status: 413 },
      );
    const body = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(body).digest("hex");
    const existing = await db.asset.findFirst({
      where: { designId: id, sha256 },
    });
    if (existing) {const variantName=await ensureVariantName(design);await archiveDesign(design.code,sha256,existing.format,body);return Response.json({ ...existing, code:design.code, variantName, reused: true });}
    let format: string;
    let meta: Metadata | undefined;
    try {
      format = detectFormat(body);
      if (format !== "psd")
        meta = await sharp(body, { limitInputPixels: 268402689 }).metadata();
    } catch {
      return Response.json(
        { error: "Geçersiz veya desteklenmeyen görsel." },
        { status: 400 },
      );
    }
    const variantName=await ensureVariantName(design);
    await archiveDesign(design.code,sha256,format,body);
    const key = `designs/${id}/${randomUUID()}.${format}`;
    const mime =
      format === "psd" ? "image/vnd.adobe.photoshop" : `image/${format}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: mime,
      }),
    );
    try {
      const asset = await db.$transaction(async tx=>{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(71405234)`;
        const duplicate=await tx.asset.findFirst({where:{designId:id,sha256}});if(duplicate)return duplicate;
        if(!await tx.sku.findFirst({where:{designId:id}}))await tx.sku.create({data:{designId:id,code:design.code,label:"Onaylı prompttan yüklenen görsel"}});
        return tx.asset.create({
        data: {
          designId: id,
          name: file.name.slice(0, 255),
          key,
          mime,
          bytes: body.length,
          sha256,
          format,
          width: meta?.width,
          height: meta?.height,
          dpi: meta?.density,
          status: format === "psd" ? "ARCHIVED" : "METADATA_READY",
        },
      });
      });
      return Response.json({...asset,code:design.code,variantName}, { status: 201 });
    } catch (e) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
      throw e;
    }
  } catch (e) {
    return failure(e);
  }
}
