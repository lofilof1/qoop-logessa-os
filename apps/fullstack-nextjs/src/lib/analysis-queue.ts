import {
  selectAnalysisProvider,
  workerId,
  localVisionModel,
} from "./analysis-engine";
import { createHash } from "node:crypto";
import { db } from "./db";
import { reviewInput } from "./analysis-review";
export async function enqueueReview(
  id: string,
  retry = false,
  provider: unknown = "local",
  consent: unknown = false,
) {
  const a = await db.imageAnalysis.findUniqueOrThrow({ where: { id } });
  const original = reviewInput(a);
  const input = {
    ...original.input,
    ...selectAnalysisProvider(provider, consent),
    localModel: localVisionModel,
  };
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        base: original.requestHash,
        provider: input.provider,
        model: localVisionModel,
      }),
    )
    .digest("hex");
  let job = await db.analysisReviewJob.upsert({
    where: { requestHash },
    create: { requestHash, input },
    update: {},
  });
  if (retry && job.state === "FAILED") {
    await db.analysisReviewJob.updateMany({
      where: { id: job.id, state: "FAILED" },
      data: {
        state: "PENDING",
        error: null,
        startedAt: null,
        finishedAt: null,
      },
    });
    job = await db.analysisReviewJob.findUniqueOrThrow({
      where: { id: job.id },
    });
  }
  await db.imageAnalysis.update({
    where: { id },
    data: { reviewJobId: job.id },
  });
  return job;
}
export async function reviewSnapshot(id: string) {
  const a = await db.imageAnalysis.findUniqueOrThrow({ where: { id } });
  const job = a.reviewJobId
    ? await db.analysisReviewJob.findUnique({
        where: { id: a.reviewJobId },
        select: {
          id: true,
          state: true,
          result: true,
          input: true,
          error: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
        },
      })
    : null;
  const worker = await db.analysisWorkerState.findUnique({
    where: {
      id: workerId(
        (job?.input as { provider?: string })?.provider === "claude"
          ? "claude"
          : "local",
      ),
    },
  });
  const online =
    !!worker?.ready && Date.now() - worker.heartbeat.getTime() < 30000;
  const provider = (job?.input as {provider?:string})?.provider === 'claude' ? 'claude' : 'local';
  const earlier = job?.state === 'PENDING' ? await db.analysisReviewJob.findMany({where:{state:{in:['PENDING','RUNNING']},createdAt:{lte:job.createdAt}},select:{id:true,input:true}}) : [];
  const position = job?.state === 'PENDING' ? earlier.filter(j=>((j.input as {provider?:string}).provider === 'claude' ? 'claude' : 'local') === provider).length : null;
  const publicJob = job
    ? {
        id: job.id,
        state: job.state,
        provider,
        queuePosition: position,
        startedAt: job.startedAt,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
      }
    : null;
  return {
    job: publicJob,
    worker: {
      online,
      message: online
        ? "Seçilen analiz servisi hazır."
        : provider === "claude" ? "Bu kayıt Claude için sırada, fakat Claude köprüsü kapalı. İstersen yerel modelle işle seçeneğini kullan." : "Yerel model bağlı değil. Mac model servisi ve Docker kontrol edilmeli; Claude’a geçilmez.",
    },
  };
}
