import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const documents = await db.knowledgeDocument.findMany({
    select: { id: true, title: true, kind: true, sourceDate: true },
    orderBy: { id: "asc" },
  });
  const selected = id
    ? await db.knowledgeDocument.findUnique({ where: { id } })
    : null;
  return (
    <>
      <Link href="/research">← Tasarım hafızası</Link>
      <header>
        <h1>Önceki çalışmalar</h1>
        <p>
          Aile analizleri, stil reçetesi, geçmiş ölçümler ve eski kurallar
          kaynak tarihleriyle korunur. Eski kurallar otomatik olarak bugünkü
          LOGESSA standardı kabul edilmez.
        </p>
      </header>
      <div className="columns">
        <section>
          {documents.map((d) => (
            <Link
              className="row"
              key={d.id}
              href={`/research/documents?${new URLSearchParams({ id: d.id })}`}
            >
              <b>{d.title}</b>
              <small>{d.sourceDate}</small>
            </Link>
          ))}
        </section>
        <section>
          {selected ? (
            <>
              <h2>{selected.title}</h2>
              <p>
                {selected.sourceDate} ·{" "}
                {selected.kind === "legacy_rules"
                  ? "Geçmiş kurallar; güncel onay gerekir"
                  : selected.kind === "historical_evidence"
                    ? "Tarihli kaynak verisi"
                    : "Önceki çalışma"}
              </p>
              <pre>{selected.body}</pre>
            </>
          ) : (
            <p>
              İncelemek istediğin çalışmayı seç. Bu ekranı açmak model çağrısı
              yapmaz.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
