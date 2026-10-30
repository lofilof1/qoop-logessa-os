import {
  selectAnalysisProvider,
  localVisionModel,
} from "@/lib/analysis-engine";
import {
  hashInput,
  skuFromFilename,
  visionListingVersion,
  listingPreferences,
} from "@/lib/listing-vision";
import { listingResearchRows } from "@/lib/listing-research";
import { profileSchema } from "@/lib/product-profile";
import { pageNumber } from "@/lib/efficiency";
import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import { s3, bucket } from "@/lib/storage";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(r: Request) {
  const url = new URL(r.url);
  const where = { deletedAt: url.searchParams.get("trash") === "1" ? { not: null } : null };
  if (url.searchParams.get("summary") === "1") {
    const total = await db.listingDraft.count({where}),
      pages = Math.max(1, Math.ceil(total / 20)),
      page = Math.min(pageNumber(url.searchParams.get("page")), pages);
    const items = await db.listingDraft.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      select: { id: true, sku: true },
    });
    return Response.json(
      { items, page, pages, total },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const drafts = await db.listingDraft.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const jobs = await db.analysisReviewJob.findMany({
    where: { id: { in: drafts.map((d) => d.jobId) } },
    select: { id: true, state: true, result: true, error: true, input: true },
  });
  return Response.json(
    drafts.map((d) => {
      const j = jobs.find((j) => j.id === d.jobId);
      return {
        ...d,
        engine:
          (j?.input as { kind?: string })?.kind === "listing-vision"
            ? "vision"
            : (j?.input as { kind?: string })?.kind === "listing-local"
              ? "local"
              : "legacy",
        job: j
          ? {
              id: j.id,
              state: j.state,
              result: j.state === "SUCCEEDED" ? j.result : null,
              error: j.error,
            }
          : null,
      };
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(r: Request) {
  let uploaded: string | undefined, originalUploaded: string | undefined, sourceOriginalKey: string | undefined,
    committed = false;
  try {
    localMutation(r);
    const limit = 30 * 1024 * 1024;
    const reader = r.body?.getReader();
    if (!reader) throw Error("Görsel seç.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit + 65536) {
        await reader.cancel();
        throw Error("En fazla 30 MB görsel yükle.");
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": r.headers.get("content-type") || "" },
    }).formData();
    const fields = z
      .object({
        sku: z.string().trim().max(60).default(""),
        notes: z.string().max(3000).default(""),
        profileMaterial: z.string().max(100).default(""),
        product: z.enum(["auto", "wallpaper", "wall mural"]).default("auto"),
      })
      .parse(Object.fromEntries(form));
    const engine = selectAnalysisProvider(
      form.get("provider"),
      form.get("claudeConsent"),
    );
    let sku = fields.sku;
    if (sku && !/^[A-Z0-9][A-Z0-9-]{2,59}$/.test(sku))
      throw Error("SKU kodunu kontrol et.");
    const file = form.get("file");
    let bytes: Buffer;
    if (file instanceof File && file.size) {
      if (file.size > limit) throw Error("En fazla 30 MB görsel seç.");
      bytes = Buffer.from(await file.arrayBuffer());
      if (!sku) sku = skuFromFilename(file.name) || "";
    } else {
      const assetId = String(form.get("sourceAssetId") || "").slice(0, 100);
      const asset = assetId
        ? await db.asset.findFirst({
            where: {
              id: assetId,
              design: {
                deletedAt: null,
                ...(sku
                  ? { OR: [{ code: sku }, { skus: { some: { code: sku } } }] }
                  : {}),
              },
            },
            include: { design: { select: { code: true } } },
          })
        : null;
      if (!asset || asset.bytes > limit || asset.format === "psd")
        throw Error("Bu SKU’ya ait uygun görsel seç veya yeni görsel yükle.");
      const stored = await s3.send(
        new GetObjectCommand({ Bucket: bucket(), Key: asset.key }),
      );
      bytes = Buffer.from(await stored.Body!.transformToByteArray());
      sourceOriginalKey = asset.key;
      if (!sku) sku = asset.design.code;
      if (bytes.length > limit) throw Error("Görsel boyutu sınırı aşıldı.");
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
        throw Error("Kayıtlı dosya doğrulanamadı.");
    }
    const imageHash = createHash("sha256").update(bytes).digest("hex");
    if (!sku) sku = "LOGESSA-" + imageHash.slice(0, 8).toUpperCase();
    const meta = await sharp(bytes, {
      limitInputPixels: 100_000_000,
    }).metadata();
    if (!["png", "jpeg", "webp", "tiff"].includes(meta.format || ""))
      throw Error("PNG, JPEG, WebP veya TIFF seç.");
    const preview = await sharp(bytes, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "white" })
      .jpeg({ quality: 88 })
      .toBuffer();
    const profileRecord = await db.qoopProductProfile.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const profile = profileRecord
      ? profileSchema.parse(profileRecord.data)
      : null;
    const identity = {
      kind: "listing-vision",
      ...engine,
      localModel: engine.provider === "local" ? localVisionModel : null,
      version: visionListingVersion,
      imageHash,
      sku,
      notes: fields.notes,
      profile: profile?.confirmed ? profile : null,
      profileId: profileRecord?.id || null,
      material:
        profile?.confirmed &&
        profile.materials.some((m) => m.name === fields.profileMaterial)
          ? fields.profileMaterial
          : "",
      product: fields.product,
      preferences: listingPreferences(profile),
      datasetHash: hashInput(
        await listingResearchRows(profile?.targetMarket || "US"),
      ),
      aiPolicy: "ai-assisted-photoshop-and-ai-mockups",
    };
    const requestHash = hashInput(identity);
    const prior = await db.analysisReviewJob.findUnique({
      where: { requestHash },
    });
    if (prior) {
      const draft = await db.listingDraft.findFirst({
        where: { jobId: prior.id },
      });
      if (draft) {
        if (draft.deletedAt) await db.listingDraft.update({where:{id:draft.id},data:{deletedAt:null}});
        return Response.json({ id: draft.id, reused: true });
      }
    }
    const previewKey = `listing/${randomUUID()}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: previewKey,
        Body: preview,
        ContentType: "image/jpeg",
      }),
    );
    uploaded = previewKey;
    if(!sourceOriginalKey){
      sourceOriginalKey=`listing-original/${randomUUID()}.${meta.format}`;
      await s3.send(new PutObjectCommand({Bucket:bucket(),Key:sourceOriginalKey,Body:bytes,ContentType:`image/${meta.format}`}));
      originalUploaded=sourceOriginalKey;
    }
    const draft = await db.$transaction(async (tx) => {
      const job = await tx.analysisReviewJob.upsert({
        where: { requestHash },
        create: {
          requestHash,
          input: JSON.parse(JSON.stringify({ ...identity, previewKey, originalKey:sourceOriginalKey, originalWidth:meta.width,originalHeight:meta.height })),
          state: "PENDING",
        },
        update: {},
      });
      return tx.listingDraft.upsert({
        where: { jobId: job.id },
        update: {},
        create: {
          sku,
          notes: fields.notes,
          material: fields.profileMaterial,
          imageHash,
          imageKey: previewKey,
          jobId: job.id,
        },
      });
    });
    if (draft.imageKey !== previewKey)
      await s3
        .send(new DeleteObjectCommand({ Bucket: bucket(), Key: previewKey }))
        .catch(() => {});
    if(draft.imageKey!==previewKey && originalUploaded)await s3.send(new DeleteObjectCommand({Bucket:bucket(),Key:originalUploaded})).catch(()=>{});
    committed = true;
    return Response.json({ id: draft.id, reused: false }, { status: 201 });
  } catch (e) {
    if(originalUploaded&&!committed)await s3.send(new DeleteObjectCommand({Bucket:bucket(),Key:originalUploaded})).catch(()=>{});
    if (uploaded && !committed)
      await s3
        .send(new DeleteObjectCommand({ Bucket: bucket(), Key: uploaded }))
        .catch(() => {});
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues.map((i) => i.message).join("; ")
            : e instanceof Error && /seç|MB|PNG|SKU|Claude|onay/.test(e.message)
              ? e.message
              : "Listing kaydedilemedi. Servisleri ve görseli kontrol et.",
      },
      { status: 400 },
    );
  }
}
