import { db } from "@/lib/db";
import { s3, bucket } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const a = await db.imageAnalysis.findUnique({ where: { id } });
    if (!a) return new Response(null, { status: 404 });
    const original = new URL(r.url).searchParams.get("original") === "1";
    const o = await s3.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: original ? a.key : a.previewKey,
      }),
    );
    return new Response(o.Body!.transformToWebStream() as ReadableStream, {
      headers: {
        "Content-Type": original ? a.mime : "image/png",
        "Content-Disposition": `${original ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(original ? a.name : "analysis-preview.png")}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": original
          ? "private, no-cache"
          : "private, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
