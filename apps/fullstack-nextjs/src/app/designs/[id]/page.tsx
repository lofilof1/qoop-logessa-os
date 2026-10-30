import {DesignActions} from "@/components/design-actions";
import {PromptActions} from "@/components/prompt-actions";
import { DesignPreparation } from "@/components/design-preparation";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Form } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await db.design.findUnique({
    where: { id },
    include: {
      assets: true,
      skus: true,
      sources: {include:{revisions:{orderBy:[{createdAt:"desc"},{id:"desc"}],take:20}},orderBy:{createdAt:"asc"}},
      researchLinks: { include: { reference: true } },
    },
  });
  if (!d) notFound();
  const approval = await db.analysisPromptApproval.findUnique({
    where: { designId: id },
    include: { analysis: true },
  });
  const analyses = await db.imageAnalysis.findMany({
    where: {
      OR: [
        { sha256: { in: d.assets.map((a) => a.sha256) } },
        ...(approval ? [{ id: approval.analysisId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const jobs = await db.analysisReviewJob.findMany({
    where: {
      id: {
        in: analyses.flatMap((a) => (a.reviewJobId ? [a.reviewJobId] : [])),
      },
    },
    select: { id: true, result: true },
  });
  const listings = await db.listingDraft.findMany({
    where: { sku: { in: [d.code, ...d.skus.map((s) => s.code)] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <>
      <header>
        <p>{d.code}</p>
        <h1>{d.title}</h1>
        <p>
          {approval && d.assets.length
            ? "Onaylı düzeltme promptu · yeni dosya yüklendi. Baskı kontrolü ayrıca yapılır."
            : d.description}
        </p>
        {approval && (
          <p>
            Kaynak analiz: {approval.analysis.title} · Kategori:{" "}
            {approval.category} ·{" "}
            <Link href="/analysis">Analiz alanını aç →</Link>
          </p>
        )}
      </header>
      {d.deletedAt&&<section className="trash-notice"><strong>Bu tasarım silinenlerde.</strong><p>Dosyaları ve kaynakları korunuyor. Yeniden kullanmak için geri al.</p></section>}
      <DesignActions id={d.id} title={d.title} description={d.description} deleted={!!d.deletedAt}/>
      <div className="workflow-actions"><Link className="text-link" href="/designs">← Tasarımlara dön</Link>{!d.deletedAt&&d.assets.length>0&&<Link className="button" href={`/listing?design=${id}`}>Bu tasarımdan listing hazırla →</Link>}</div>
      <div hidden={!!d.deletedAt}><DesignPreparation designId={id} assets={d.assets.map(a=>({id:a.id,name:a.name,width:a.width,height:a.height,format:a.format}))}/></div>
      <div className="columns">
        <section>
          <h2>Master dosyalar</h2>
          {d.assets.map((a) => (
            <article key={a.id}>
              <a href={`/api/assets/${a.id}`}>{a.name} ↓</a>
              <p>
                {a.format.toUpperCase()} · {(a.bytes / 1048576).toFixed(2)} MB ·{" "}
                {a.width
                  ? `${a.width} × ${a.height} px · ${a.dpi ?? "—"} DPI`
                  : "PSD arşivi"}{" "}
                · {a.status}
              </p>
            </article>
          ))}
          {!d.deletedAt&&(d.assets.length ? <details><summary>Başka bir master dosya ekle (isteğe bağlı)</summary><Form kind="asset" designId={id}/></details> : <Form kind="asset" designId={id}/>)}
        </section>
        <section>
          <h2>SKU kayıtları</h2>
          {d.skus.map((s) => (
            <p key={s.id}>
              <b>{s.code}</b> — {s.label}
            </p>
          ))}
          {!d.deletedAt&&<Form kind="sku" designId={id} />}
        </section>
      </div>
      <details>
        <summary>Tasarım bilgileri · promptlar, kriterler ve kaynaklar</summary>
        <section>
          <h2>Araştırma bağlantıları</h2>
          {d.researchLinks.map((l) => (
            <p key={l.id}>
              <Link href={`/research/${encodeURIComponent(l.referenceId)}`}>
                {l.reference.title}
              </Link>{" "}
              · {l.influence}
            </p>
          ))}
          <p>
            <Link href="/research">Tasarım hafızasından referans ekle →</Link>
          </p>
        </section>
        <section>
          <h2>Üretim kaynakları</h2>
          {d.sources.map((s) => (
            <article key={s.id}>
              <PromptActions key={`${s.id}-${s.revisions[0]?.id||"original"}-${s.deletedAt||"active"}`} id={s.id} original={s.prompt} prompt={s.revisions[0]?.prompt||s.prompt} deleted={!!s.deletedAt} versions={s.revisions.map(v=>({id:v.id,prompt:v.prompt,date:v.createdAt.toISOString()}))}/>
              <p>
                Kaynak: {s.provider} · Model: {s.model || "—"} · Seed:{" "}
                {s.seed || "—"} · Job: {s.jobId || "—"}
              </p>
              <details>
                <summary>
                  Oluşturulma kriterleri ve kayıtlı tüm bilgiler
                </summary>
                <pre>{JSON.stringify(s.raw, null, 2)}</pre>
              </details>
              {s.sourceUrl && (
                <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                  Kaynağı aç ↗
                </a>
              )}
            </article>
          ))}
          {!d.deletedAt&&<details><summary>Yeni kaynak prompt ekle</summary><Form kind="source" designId={id}/></details>}
        </section>
        <section>
          <h2>Analizler ve düzeltmeler</h2>
          {analyses.length ? (
            analyses.map((a) => (
              <details key={a.id}>
                <summary>{a.title}</summary>
                <p>{a.notes}</p>
                <pre>
                  {JSON.stringify(
                    jobs.find((j) => j.id === a.reviewJobId)?.result,
                    null,
                    2,
                  )}
                </pre>
                <pre>{a.report}</pre>
              </details>
            ))
          ) : (
            <p>Bu dosyalarla eşleşen analiz henüz yok.</p>
          )}
        </section>
        <section>
          <h2>Listing kayıtları</h2>
          {listings.length ? (
            <p>
              {listings.length} taslak ·{" "}
              <Link href="/listing">Listing alanında aç →</Link>
            </p>
          ) : (
            <p>Bu kod için listing taslağı henüz yok.</p>
          )}
        </section>
      </details>
    </>
  );
}
