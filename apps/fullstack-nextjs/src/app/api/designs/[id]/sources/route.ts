import { db } from "@/lib/db";
import { sourceInput } from "@/lib/validation";
import { failure } from "@/lib/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!(await db.design.findUnique({ where: { id } })))
      return Response.json({ error: "Tasarım bulunamadı" }, { status: 404 });
    const raw = await r.json();
    const data = sourceInput.parse(raw);
    return Response.json(
      await db.source.create({ data: { ...data, designId: id, raw } }),
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
