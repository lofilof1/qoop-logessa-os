import { db } from "../src/lib/db";
import { s3, bucket } from "../src/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  reviewInstruction,
  reviewInput,
  reviewResultSchema,
  parseReview,
} from "../src/lib/analysis-review";
import { runVision } from "./vision-cli";
import { runLocalVision, localModelReady } from "./local-vision";
import { processListingJob } from "./listing-vision-worker";
import type { VisionListingInput } from "../src/lib/listing-vision";
import { assertClaudeConsent } from "../src/lib/analysis-engine";
import sharp from "sharp";
import { z } from "zod";
const mode = process.env.QOOP_WORKER_PROVIDER || "local";
let stopping = false,
  ready = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));
async function heartbeat(active = true) {
  ready = active && (mode === "claude" || (await localModelReady()));
  const id = mode === "claude" ? "local-claude" : "local-ai";
  const data = {
    ready,
    heartbeat: new Date(),
    message:
      mode === "claude"
        ? "Claude köprüsü yalnız açık izinli işler için hazır"
        : ready
          ? "Mac üzerinde yerel görsel modeli hazır"
          : "Yerel görsel modeli henüz hazır değil; dış modele geçilmez",
  };
  await db.analysisWorkerState.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}
await heartbeat();
const pulse = setInterval(() => heartbeat().catch(() => {}), 10000);
console.log(
  mode === "claude"
    ? "İsteğe bağlı Claude köprüsü hazır; otomatik çağrı yapılmaz."
    : "Qoop yerel görsel işleyicisi hazır.",
);
try {
  let expiry = 0;
  while (!stopping) {
    if (Date.now() - expiry > 20000) {
      await db.analysisReviewJob.updateMany({
        where: {
          state: "RUNNING",
          startedAt: { lt: new Date(Date.now() - 15 * 60000) },
        },
        data: {
          state: "FAILED",
          error: "İşlem kesilmiş; otomatik tekrar yapılmadı.",
          finishedAt: new Date(),
        },
      });
      expiry = Date.now();
    }
    if (!ready) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    const candidates = await db.analysisReviewJob.findMany({
      where: {
        state: "PENDING",
        OR: [
          { input: { path: ["version"], string_starts_with: "lesson-" } },
          { input: { path: ["kind"], equals: "listing-vision" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    const pending = candidates.find((j) =>
      mode === "claude"
        ? (j.input as { provider?: string }).provider === "claude"
        : (j.input as { provider?: string }).provider !== "claude",
    );
    if (!pending) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    const claim = await db.analysisReviewJob.updateMany({
      where: { id: pending.id, state: "PENDING" },
      data: { state: "RUNNING", startedAt: new Date(), error: null },
    });
    if (!claim.count) continue;
    try {
      const input = pending.input as unknown as ReturnType<
        typeof reviewInput
      >["input"] & {
        provider?: string;
        claudeConsent?: boolean;
        kind?: string;
      };
      if (mode === "claude") assertClaudeConsent(input);
      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket(), Key: input.previewKey }),
      );
      const image = await sharp(
        Buffer.from(await object.Body!.transformToByteArray()),
        { limitInputPixels: 4_000_000 },
      )
        .resize({
          width: mode === "claude" ? 1600 : 1024,
          height: mode === "claude" ? 1600 : 1024,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "white" })
        .jpeg({ quality: 88 })
        .toBuffer();
      if (input.kind === "listing-vision") {
        await processListingJob(
          pending.id,
          pending.input as unknown as VisionListingInput,
          image,
        );
      } else {
        const instruction = reviewInstruction(input) + (mode === "local" ? "\nKISA RAPOR: Her observation/evidence/recommendation en fazla 100 karakter. summary en fazla 200 karakter. strengths/preserve/limits en fazla üç kısa öğe. correctedPrompt en fazla 1000 karakter. negativePrompt en fazla 200 karakter. Türkçe raporda İngilizce terim tekrarları ekleme." : "");
        const localSchema = z.toJSONSchema(reviewResultSchema, {unrepresentable:"any"}) as Record<string, any>;
        function boundStrings(node:any,key="") {
          if(!node||typeof node!=="object")return;
          if(node.type==="string"&&node.maxLength)node.maxLength=Math.min(node.maxLength,key==="correctedPrompt"?1000:key==="negativePrompt"||key==="summary"?200:140);
          for(const [k,v] of Object.entries(node.properties||{}))boundStrings(v,k);
          if(node.items)boundStrings(node.items,key);
        }
        boundStrings(localSchema);
        const response =
          mode === "claude"
            ? await runVision(
                image,
                instruction,
                pending.requestHash,
                "prompt",
                parseReview,
                true,
              )
            : await runLocalVision(
                image,
                instruction,
                pending.requestHash,
                localSchema,
                parseReview,
                {outputTokens:6000,contextTokens:16384},
              );
        const result = response.result;
        if (
          result.criteria.some((c) =>
            c.lessonPages.some(
              (n) => !input.lessonEvidence.some((p) => p.page === n),
            ),
          )
        )
          throw Error("Rapor verilen ders sayfaları dışında kaynak gösterdi.");
        await db.analysisReviewJob.update({
          where: { id: pending.id },
          data: {
            state: "SUCCEEDED",
            result,
            usage: response.usage,
            finishedAt: new Date(),
          },
        });
      }
      console.log("Görsel işlemi tamamlandı:", pending.id, mode);
    } catch (e) {
      await db.analysisReviewJob.update({
        where: { id: pending.id },
        data: {
          state: "FAILED",
          error:
            e instanceof Error && e.name === "ZodError"
              ? "Yerel/model yanıtı doğrulanamadı. Yanıt korundu; Claude’a geçilmedi, otomatik tekrar yapılmadı."
              : e instanceof Error
                ? e.message
                : "Analiz tamamlanamadı.",
          finishedAt: new Date(),
        },
      });
      console.log("Görsel işlemi tamamlanamadı:", pending.id);
    }
  }
} finally {
  clearInterval(pulse);
  await heartbeat(false).catch(() => {});
  await db.$disconnect();
}
