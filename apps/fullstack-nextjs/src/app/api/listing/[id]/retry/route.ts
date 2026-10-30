import { assertClaudeConsent } from "@/lib/analysis-engine";
import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  localMutation(r);
  const { id } = await params;
  const d = await db.listingDraft.findUnique({ where: { id } });
  if (!d) return new Response(null, { status: 404 });
  const job = await db.analysisReviewJob.findUnique({ where: { id: d.jobId } });
  if ((job?.input as { kind?: string })?.kind !== "listing-vision")
    return Response.json(
      {
        error:
          "Bu eski kayıt korunuyor. Görseli yeni formdan analiz edebilirsin.",
      },
      { status: 409 },
    );
  if ((job?.input as { provider?: string })?.provider === "claude") {
    try {
      assertClaudeConsent(
        job!.input as { provider?: string; claudeConsent?: boolean },
      );
    } catch {
      return Response.json(
        {
          error:
            "Bu eski işte Claude izni yok. Yerel modla yeni taslak oluştur.",
        },
        { status: 409 },
      );
    }
  }
  const reset = await db.analysisReviewJob.updateMany({
    where: { id: d.jobId, state: "FAILED" },
    data: { state: "PENDING", error: null, startedAt: null, finishedAt: null },
  });
  return Response.json({ queued: reset.count === 1 });
}
