import { db } from "@/lib/db";
import { failure } from "@/lib/http";
import { z } from "zod";
const input = z.object({
  designId: z.string().min(1),
  referenceId: z.string().min(1),
  influence: z.enum(["palette", "composition", "motif", "technique", "seo"]),
});
export async function POST(r: Request) {
  try {
    const data = input.parse(await r.json());
    if (
      !(await db.design.findUnique({ where: { id: data.designId } })) ||
      !(await db.researchReference.findUnique({
        where: { id: data.referenceId },
      }))
    )
      return Response.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    return Response.json(
      await db.designResearchLink.upsert({
        where: {
          designId_referenceId: {
            designId: data.designId,
            referenceId: data.referenceId,
          },
        },
        create: data,
        update: { influence: data.influence },
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
