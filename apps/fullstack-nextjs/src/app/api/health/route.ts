import { db } from "@/lib/db";
import { s3, bucket } from "@/lib/storage";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
export const dynamic = "force-dynamic";
export async function GET() {
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    s3.send(new HeadBucketCommand({ Bucket: bucket() })),
  ]);
  const database = checks[0].status === "fulfilled",
    storage = checks[1].status === "fulfilled";
  return Response.json(
    {
      ok: database && storage,
      database,
      storage,
      worker: "NOT_IMPLEMENTED_SPRINT_3",
    },
    { status: database && storage ? 200 : 503 },
  );
}
