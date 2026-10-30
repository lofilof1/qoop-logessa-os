import { db } from "@/lib/db";
import { designInput } from "@/lib/validation";
import { failure } from "@/lib/http";
export async function POST(r: Request) {
  try {
    const d = await db.design.create({
      data: designInput.parse(await r.json()),
    });
    return Response.json(d, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function GET() {
  try {
    return Response.json(
      await db.design.findMany({ where:{deletedAt:null}, orderBy: { createdAt: "desc" } }),
    );
  } catch (e) {
    return failure(e);
  }
}
