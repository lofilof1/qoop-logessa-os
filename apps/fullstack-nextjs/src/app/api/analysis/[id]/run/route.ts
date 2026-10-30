import { enqueueReview, reviewSnapshot } from "@/lib/analysis-queue";
import { localMutation } from "@/lib/image-connection";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return Response.json(await reviewSnapshot(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "İnceleme durumu okunamadı." },
      { status: 404 },
    );
  }
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    localMutation(r);
    const { id } = await params;
    const { retry, provider, claudeConsent } = z
      .object({
        retry: z.boolean().optional(),
        provider: z.enum(["local", "claude"]).default("local"),
        claudeConsent: z.boolean().default(false),
      })
      .parse(await r.json());
    await enqueueReview(id, retry, provider, claudeConsent);
    return Response.json(await reviewSnapshot(id));
  } catch {
    return Response.json({ error: "Analiz başlatılamadı." }, { status: 400 });
  }
}
