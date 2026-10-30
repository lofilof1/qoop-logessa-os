import { db } from "@/lib/db";
import { s3, bucket } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { failure } from "@/lib/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const a = await db.asset.findUnique({ where: { id } });
    if (!a)
      return Response.json({ error: "Dosya bulunamadı" }, { status: 404 });
    const o = await s3.send(
      new GetObjectCommand({ Bucket: bucket(), Key: a.key }),
    );
    return new Response(o.Body!.transformToWebStream() as ReadableStream, {
      headers: {
        "Content-Type": a.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
