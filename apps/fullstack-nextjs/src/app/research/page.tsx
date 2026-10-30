import { db } from "@/lib/db";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Research({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    family?: string;
    tab?: string;
    page?: string;
  }>;
}) {
  const p = await searchParams;
  const q = p.q?.trim().slice(0, 100) || "";
  const family = p.family || "";
  const tab = ["references", "keywords", "prompts"].includes(p.tab || "")
    ? p.tab!
    : "references";
  const page = Math.max(1, Math.min(1000, Number(p.page) || 1));
  const size = 24;
  const [families, latest, refCount, keyCount, promptCount] = await Promise.all(
    [
      db.researchFamily.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { references: true, prompts: true } } },
      }),
      db.knowledgeImport.findFirst({ orderBy: { importedAt: "desc" } }),
      db.researchReference.count(),
      db.researchKeyword.count(),
      db.researchPrompt.count(),
    ],
  );
  const where = {
    ...(family ? { familyId: family } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const references =
    tab === "references"
      ? await db.researchReference.findMany({
          where,
          include: { family: true, _count: { select: { links: true } } },
          take: size,
          skip: (page - 1) * size,
          orderBy: { title: "asc" },
        })
      : [];
  const keywords =
    tab === "keywords"
      ? await db.researchKeyword.findMany({
          where: {
            focused: true,
            ...(q
              ? { term: { contains: q, mode: "insensitive" as const } }
              : {}),
          },
          take: 50,
          skip: (page - 1) * 50,
          orderBy: { term: "asc" },
        })
      : [];
  const prompts =
    tab === "prompts"
      ? await db.researchPrompt.findMany({
          where,
          include: { family: true },
          orderBy: { code: "asc" },
        })
      : [];
  return (
    <>
      <header>
        <p>QOOP ARAŞTIRMA KÜTÜPHANESİ</p>
        <h1>Tasarım hafızası</h1>
        <p>
          {refCount} tekilleştirilmiş referans ·{" "}
          {keyCount.toLocaleString("tr-TR")} kelime · {promptCount} mevcut
          prompt
        </p>
        <p>
          Kaynak kopyası: {latest?.snapshotDate || "Henüz aktarılmadı"}. Canlı
          Etsy verisi değildir; satış alanları kaynak tahminleridir.
        </p>
      </header>
      <section>
        <h2>Özgün tasarıma giden kaynaklar</h2>
        <p>
          <Link href="/research/documents">
            Aile analizleri, stil reçetesi ve geçmiş çalışmalar →
          </Link>
        </p>
        <p>
          Araştırma referansları kendi ürettiğin tasarımlardan ayrı tutulur. Bir
          kaynağı açıp hangi özelliğinin tasarımını beslediğini kaydedebilirsin.
          Aileler mevcut araştırma sınıflarıdır; LOGESSA estetiği olarak otomatik
          onaylanmaz.
        </p>
        <form method="get">
          <div className="columns">
            <label>
              Görünüm
              <select name="tab" defaultValue={tab}>
                <option value="references">Görsel referanslar</option>
                <option value="keywords">
                  Duvar kağıdı / mural kelimeleri
                </option>
                <option value="prompts">Önceki tasarım promptları</option>
              </select>
            </label>
            <label>
              Aile (referans ve prompt)
              <select name="family" defaultValue={family}>
                <option value="">Tüm aileler</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f._count.references})
                    {f.deferred ? " · ertelenmiş" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Ara
            <input
              name="q"
              defaultValue={q}
              placeholder="botanical, chinoiserie, garden…"
            />
          </label>
          <button>Ara / filtrele</button>
        </form>
      </section>
      {tab === "references" && (
        <section>
          <h2>Referanslar</h2>
          <div className="research-grid">
            {references.map((r) => (
              <Link
                className="research-card"
                key={r.id}
                href={`/research/${encodeURIComponent(r.id)}`}
              >
                {r.imagePath ? (
                  <img src={r.imagePath} alt={r.title} loading="lazy" />
                ) : (
                  <div className="image-empty">Görsel kaynakta yok</div>
                )}
                <small>
                  {r.family.name} ·{" "}
                  {r.purpose === "beğeni"
                    ? "Beğeni referansı"
                    : "Pazar referansı"}
                </small>
                <h3>{r.title}</h3>
                <p>
                  {r.shop} · {r._count.links} tasarımla bağlı
                </p>
              </Link>
            ))}
          </div>
          {!references.length && <p>Eşleşen kayıt yok.</p>}
        </section>
      )}
      {tab === "keywords" && (
        <section>
          <h2>Odaklı kelimeler</h2>
          <p>
            İlgisiz/dijital sınıfı çıkarıldı. Bu görünüm yalnızca
            wallpaper/mural içeren kelimeleri listeler; renk, motif ve diğer
            ilgili kelimeler de veritabanında korunur. Arama ile aile filtresi
            uygulanmaz.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kelime</th>
                  <th>Sınıf</th>
                  <th>Kaynak arama değeri</th>
                  <th>Rekabet</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k) => {
                  const d = k.data as Record<string, string>;
                  return (
                    <tr key={k.term}>
                      <td>{k.term}</td>
                      <td>{k.category}</td>
                      <td>{d.aylik_arama}</td>
                      <td>{d.rakip_ilan || "Veri yok"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "prompts" && (
        <section>
          <h2>Mevcut tasarım fikirleri</h2>
          <p>
            Bunlar kaynak sistemden aktarılmış promptlardır. Görsel üretildiği
            veya baskıya uygun olduğu anlamına gelmez. Kullanım durumu 16 Ekim
            kopyasındaki bilgidir.
          </p>
          {prompts.map((x) => (
            <article key={x.code}>
              <p>
                {x.code} · {x.family.name} ·{" "}
                {x.used ? "Kaynakta kullanılmış" : "Kaynakta kullanılmamış"}
              </p>
              <h3>{x.title}</h3>
              <details>
                <summary>Prompt ve kaynak detayları</summary>
                <p className="prompt">{x.prompt}</p>
                <pre>{JSON.stringify(x.data, null, 2)}</pre>
              </details>
            </article>
          ))}
        </section>
      )}
      {tab !== "prompts" && (
        <nav className="pagination">
          {page > 1 && (
            <Link
              href={`/research?${new URLSearchParams({ q, family, tab, page: String(page - 1) })}`}
            >
              ← Önceki
            </Link>
          )}
          <span>Sayfa {page}</span>
          {(references.length === size || keywords.length === 50) && (
            <Link
              href={`/research?${new URLSearchParams({ q, family, tab, page: String(page + 1) })}`}
            >
              Sonraki →
            </Link>
          )}
        </nav>
      )}
      <section>
        <h2>Kullanım tasarrufu</h2>
        <p>
          Arama, filtreleme, tekilleştirme ve kayıt bağlama yerelde çalışır;
          model çağrısı yapmaz. Claude için en fazla 5 referans, 15 kelime ve 3
          mevcut prompt başlığı içeren bir bağlam paketi hazırlanır. Aynı veri,
          görev ve ajanla üretilen yanıt yeniden kullanılır. Görsel analizi bu
          aktarım sırasında yapılmadı.
        </p>
      </section>
    </>
  );
}
