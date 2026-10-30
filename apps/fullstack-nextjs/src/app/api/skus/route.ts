import { db } from "@/lib/db";
import { skuInput } from "@/lib/validation";
import { failure } from "@/lib/http";
export async function POST(r: Request) {
  try {
    const data = skuInput.parse(await r.json());
    if (!(await db.design.findUnique({ where: { id: data.designId } })))
      return Response.json({ error: "Tasarım bulunamadı" }, { status: 404 });
    return Response.json(await db.sku.create({ data }), { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
