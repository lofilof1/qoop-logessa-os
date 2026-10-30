import { workerId } from "@/lib/analysis-engine";
import { assembleDescription } from "@/lib/listing-description";
import { designDisclosure, mockupDisclosure } from "@/lib/listing-vision";
import { profileSchema } from "@/lib/product-profile";
import { db } from "@/lib/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const d = await db.listingDraft.findUnique({
    where: { id },
    select: { id: true, sku: true, jobId: true },
  });
  if (!d) return new Response(null, { status: 404 });
  const j = await db.analysisReviewJob.findUnique({
    where: { id: d.jobId },
    select: { id: true, state: true, result: true, error: true, input: true },
  });
  let result = j?.state === "SUCCEEDED" ? j.result : null;
  if (result && (j?.input as { kind?: string })?.kind === "listing-vision") {
    const raw = result as unknown as {
      description: string;
      quality?: Record<string, unknown>;
      reviewStatus?: string;
    };
    const saved = (j!.input as { profile?: unknown }).profile;
    const latest=await db.qoopProductProfile.findFirst({orderBy:[{createdAt:"desc"},{id:"desc"}]});
    const current=latest?profileSchema.safeParse(latest.data):null;
    const p = current?.success && current.data.confirmed && ["qoop-2026-10-28","logessa-2026-10-29"].includes(current.data.descriptionStandard) ? current : saved ? profileSchema.safeParse(saved) : null;
    const formatted = assembleDescription(
      raw.description,
      p?.success ? p.data : null,
      designDisclosure,
      mockupDisclosure,
      ((raw as any).visual?.product || (j!.input as any).product) === "wall mural" ? "wall mural" : "wallpaper",
      (raw as any).title || "",
    );
    result = JSON.parse(
      JSON.stringify({
        ...raw,
        description: formatted.description,
        descriptionSections: formatted.sections,
        missingSections: formatted.missing,
        reviewStatus: formatted.missing.length
          ? "NEEDS_REVIEW"
          : raw.reviewStatus,
        quality: raw.quality
          ? {
              ...raw.quality,
              descriptionCharacters: formatted.description.length,
            }
          : undefined,
      }),
    );
  }
  const worker = await db.analysisWorkerState.findUnique({
    where: {
      id: workerId(
        (j?.input as { provider?: string })?.provider === "claude"
          ? "claude"
          : "local",
      ),
    },
  });
  return Response.json(
    {
      id: d.id,
      sku: d.sku,
      provider: (j?.input as { provider?: string })?.provider || "previous",
      workerReady:
        !!worker?.ready && Date.now() - worker.heartbeat.getTime() < 30000,
      progress: (j?.result as { stage?: string })?.stage || null,
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
            result,
            error: j.error,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
