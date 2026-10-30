import { db } from "@/lib/db";
import { s3, bucket } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const d = await db.listingDraft.findUnique({ where: { id } });
  if (!d) return new Response(null, { status: 404 });
  const object = await s3.send(
    new GetObjectCommand({ Bucket: bucket(), Key: d.imageKey }),
  );
  return new Response(Buffer.from(await object.Body!.transformToByteArray()), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
