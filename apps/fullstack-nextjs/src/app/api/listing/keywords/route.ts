import { sameKeywordColumns } from "@/lib/efficiency";
import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import { importedKeywords } from "@/lib/listing";
export async function POST(r: Request) {
  try {
    localMutation(r);
    if (Number(r.headers.get("content-length")) > 2_100_000)
      throw Error("En fazla 2 MB CSV yükle.");
    const body = await r.arrayBuffer();
    if (body.byteLength > 2_100_000) throw Error("En fazla 2 MB CSV yükle.");
    const form = await new Response(body, {
      headers: { "Content-Type": r.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 2_000_000)
      throw Error("En fazla 2 MB CSV seç.");
    const rows = importedKeywords(await file.text());
    if (!rows.length || rows.length > 10000)
      throw Error("CSV 1–10000 farklı kelime içermeli.");
    const existing = await db.researchKeyword.findMany({
      where: { term: { in: rows.map((r) => r.term) } },
      select: { term: true, data: true },
    });
    const prior = new Map(existing.map((r) => [r.term, r.data]));
    const changed = rows.filter((r) => {
      const old = prior.get(r.term) as
        { source?: string; columns?: unknown } | undefined;
      return (
        old?.source !== "manual-erank" ||
        !sameKeywordColumns(old.columns, r.data.columns)
      );
    });
    if (!changed.length)
      return Response.json({ count: 0, unchanged: rows.length });
    await db.$transaction(
      async (tx) => {
        for (const k of changed)
          await tx.researchKeyword.upsert({
            where: { term: k.term },
            create: { ...k, focused: true },
            update: { data: k.data },
          });
      },
      { timeout: 60000 },
    );
    return Response.json({
      count: changed.length,
      unchanged: rows.length - changed.length,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "CSV alınamadı." },
      { status: 400 },
    );
  }
}

export async function GET() {
  const [total, manual] = await Promise.all([
    db.researchKeyword.count(),
    db.researchKeyword.count({
      where: { data: { path: ["source"], equals: "manual-erank" } },
    }),
  ]);
  return Response.json(
    { total, manual },
    { headers: { "Cache-Control": "no-store" } },
  );
}
