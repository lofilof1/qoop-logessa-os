import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import { z } from "zod";
export async function PATCH(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    localMutation(r);
    const { id } = await params;
    const { report } = z
      .object({ report: z.string().max(50000) })
      .parse(await r.json());
    await db.imageAnalysis.update({ where: { id }, data: { report } });
    return Response.json({ saved: true });
  } catch {
    return Response.json({ error: "Rapor kaydedilemedi." }, { status: 400 });
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await db.imageAnalysis.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      mode: true,
      focus: true,
      notes: true,
      report: true,
      width: true,
      height: true,
      wallWidth: true,
      wallHeight: true,
      name: true,
    },
  });
  return a
    ? Response.json(a, { headers: { "Cache-Control": "no-store" } })
    : new Response(null, { status: 404 });
}
