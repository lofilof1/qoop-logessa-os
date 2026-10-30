import { db } from "@/lib/db";
import { localMutation } from "@/lib/image-connection";
import { observationSchema, watchSchema, watchCsv } from "@/lib/keyword-watch";
export async function GET(r: Request) {
  const u = new URL(r.url);
  const q = (u.searchParams.get("q") || "").slice(0, 120);
  const priority = Number(u.searchParams.get("priority"));
  const where = {
    ...(q ? { term: { contains: q, mode: "insensitive" as const } } : {}),
    ...([1, 2, 3].includes(priority) ? { priority } : {}),
  };
  const items = await db.keywordWatch.findMany({
    where,
    orderBy: [{ priority: "asc" }, { term: "asc" }],
    take: 500,
    include: {
      observations: {
        orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      _count: { select: { observations: true } },
    },
  });
  if (u.searchParams.get("csv") === "1")
    return new Response(
      watchCsv(items.map((k) => ({ ...k, ...(k.observations[0] || {}) }))),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=qoop-erank-watch.csv",
          "Cache-Control": "no-store",
        },
      },
    );
  const historyTerm = u.searchParams.get("history");
  if (historyTerm)
    return Response.json(
      await db.keywordObservation.findMany({
        where: { term: historyTerm },
        orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  const terms = items.map((k) => k.term);
  const evidence = await db.researchKeyword.findMany({
    where: { term: { in: terms } },
    select: { term: true, data: true },
  });
  return Response.json(
    {
      items: items.map((k) => ({
        ...k,
        tagEligible: k.term.length <= 20,
        historical: evidence.find((x) => x.term === k.term)?.data || null,
      })),
      total: await db.keywordWatch.count(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(r: Request) {
  try {
    localMutation(r);
    const text = await r.text();
    if (text.length > 10000) throw Error("İstek çok büyük.");
    const body = JSON.parse(text);
    if (body.kind === "watch") {
      const data = watchSchema.parse(body);
      await db.keywordWatch.upsert({
        where: { term: data.term },
        create: data,
        update: data,
      });
      return Response.json({ ok: true });
    }
    const data = observationSchema.parse(body);
    const existing = await db.keywordObservation.findFirst({
      where: {
        term: data.term,
        observedAt: data.observedAt,
        market: data.market,
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      if (
        ["searches", "clicks", "competition", "ctr", "notes"].every(
          (k) =>
            existing[k as keyof typeof existing] ===
            data[k as keyof typeof data],
        )
      )
        return Response.json({ ok: true, reused: true });
      // A correction appends a version; the prior observation remains in history.
    }
    await db.keywordObservation.create({ data });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Kaydedilemedi." },
      { status: 400 },
    );
  }
}
