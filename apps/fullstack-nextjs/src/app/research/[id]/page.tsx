import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReferenceLink } from "@/components/reference-link";
export const dynamic = "force-dynamic";
export default async function Reference({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await db.researchReference.findUnique({
    where: { id: decodeURIComponent(id) },
    include: { family: true, links: { include: { design: true } } },
  });
  if (!r) notFound();
  const designs = await db.design.findMany({
    select: { id: true, title: true, code: true },
    orderBy: { code: "asc" },
  });
  const d = r.data as Record<string, any>;
  return (
    <>
      <Link href="/research">← Araştırma kütüphanesi</Link>
      <header>
        <p>
          {r.family.name} · {d.aliases?.join(", ") || r.listingId}
        </p>
        <h1>{r.title}</h1>
        <p>
          {r.shop} · Kayıt tarihi {r.observedAt}
        </p>
      </header>
      <div className="columns">
        <section>
          {r.imagePath && (
            <img className="reference-image" src={r.imagePath} alt={r.title} />
          )}
          <p>{d.summary}</p>
          {r.url && (
            <a href={r.url} target="_blank" rel="noreferrer">
              Orijinal kaynağı aç ↗
            </a>
          )}
          <h2>Kaynak analizi</h2>
          <p>
            Önceki sistemden aktarılmış yorumlardır; yeni bir görsel inceleme
            yapılmadı.
          </p>
          {Object.entries(d.analysis || {})
            .filter(([k, v]) => typeof v === "string" && v)
            .map(([k, v]) => (
              <details key={k}>
                <summary>{k.replaceAll("_", " ")}</summary>
                <p className="prompt">{String(v)}</p>
              </details>
            ))}
          <h2>Pazar kanıtı</h2>
          <p>
            Satış/hız değerleri tahmin veya türetilmiş kaynak ölçütüdür. Düşük
            ilan fiyatı tam duvar fiyatı olarak yorumlanmamalı.
          </p>
          <pre>{JSON.stringify(d.market, null, 2)}</pre>
          <small>{d.sourcePaths?.join(" · ")}</small>
        </section>
        <section>
          <h2>Kendi tasarımınla ilişkilendir</h2>
          <p>
            Kaynağın yalnızca hangi özelliğinden yararlandığını belirt. Aynı
            kompozisyonun kopyalanması hedeflenmez.
          </p>
          <ReferenceLink referenceId={r.id} designs={designs} />
          <h2>Mevcut bağlantılar</h2>
          {r.links.map((l) => (
            <p key={l.id}>
              <Link href={`/designs/${l.designId}`}>
                {l.design.code} · {l.design.title}
              </Link>{" "}
              — {l.influence}
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
