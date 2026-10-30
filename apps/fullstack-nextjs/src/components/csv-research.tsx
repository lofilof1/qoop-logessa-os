"use client";
import {CsvBatchUpload} from "./csv-batch-upload";
import {WorkspaceNav} from "./workspace-nav";
import {TopListingResearch} from "./top-listing-research";
import { useEffect, useState } from "react";
import type { CsvSettings, CsvRecord } from "@/lib/csv-research";
import type { ResearchReport } from "@/lib/csv-research-report";
type Config = {
  name: string;
  headers: string[];
  total: number;
  settings: CsvSettings;
};
type Preview = {
  name: string;
  sha: string;
  settings: CsvSettings;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    repeated: number;
    newRows: number;
    revisions: number;
    errors: { row: number; error: string }[];
  };
  sample: CsvRecord[];
  reused: boolean;
};
type Batch = {
  id: string;
  fileSha: string;
  file: { name: string };
  createdAt: string;
  stats: { inserted?: number; newRows: number; invalid: number };
  settings: CsvSettings;
};
const labels: Record<string, string> = {
  term: "Kelime",
  searches: "Arama",
  clicks: "Tıklama",
  competition: "Rekabet",
  ctr: "CTR",
  market: "Ülke",
  period: "Dönem / ay",
  observedAt: "Kontrol tarihi",
  definition: "Metrik türü",
};
export function CsvResearch() {
  const [workspace,setWorkspace]=useState("report"),[topVisited,setTopVisited]=useState(false);
  const [files, setFiles] = useState<File[]>([]),
    [configs, setConfigs] = useState<Config[]>([]),
    [preview, setPreview] = useState<Preview[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reportBusy, setReportBusy] = useState(false),
    [reportMessage, setReportMessage] = useState(""),
    [partial, setPartial] = useState(false),
    [revisions, setRevisions] = useState(false),
    [market, setMarket] = useState("unknown"),
    [query, setQuery] = useState(""),
    [report, setReport] = useState<ResearchReport | null>(null),
    [batches, setBatches] = useState<Batch[]>([]);
  async function refresh() {
    setReportBusy(true);
    setReportMessage("Kelime raporu hazırlanıyor…");
    try {
    const r = await fetch(
      `/api/listing/csv?market=${encodeURIComponent(market)}&q=${encodeURIComponent(query)}`,
    );
    const x = await r.json();
    if (!r.ok) throw Error(x.error || "Rapor okunamadı.");
    setReport(x.report);
    setBatches(x.batches);
    setReportMessage(`Rapor hazır: ${x.report.terms} kelime, ${x.report.total} gözlem. Yeni dosya seçmen gerekmiyor.`);
    } catch(e) {
      setReportMessage(e instanceof Error ? e.message : "Rapor oluşturulamadı.");
      throw e;
    } finally { setReportBusy(false); }
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, [market]);
  async function send(mode: string, selected = files) {
    const form = new FormData();
    selected.forEach((f) => form.append("files", f));
    form.set("mode", mode);
    form.set(
      "settings",
      JSON.stringify(mode === "inspect" ? [] : configs.map((c) => c.settings)),
    );
    form.set("allowPartial", String(partial));
    form.set("acceptRevisions", String(revisions));
    const r = await fetch("/api/listing/csv", { method: "POST", body: form });
    const x = await r.json();
    if (!r.ok) throw Error(x.error || "CSV alınamadı.");
    return x;
  }
  const update = (i: number, key: keyof CsvSettings, value: unknown) => {
    setPreview([]);
    setPartial(false);
    setRevisions(false);
    setConfigs((old) =>
      old.map((c, j) =>
        j === i ? { ...c, settings: { ...c.settings, [key]: value } } : c,
      ),
    );
  };
  return (
    <section id="csv-research">
      <div className="section-heading"><div><p className="eyebrow">ARAŞTIRMA</p><h2>Veriden tasarım kararına</h2></div></div>
      <WorkspaceNav prefix="research" value={workspace} onChange={v=>{setWorkspace(v);if(v==="listings")setTopVisited(true);}} items={[{id:"report",label:"Kelime raporu"},{id:"upload",label:"CSV yükle"},{id:"listings",label:"İlan verileri"}]}/>
      <div role="tabpanel" id="research-panel-listings" aria-labelledby="research-tab-listings" hidden={workspace!=="listings"}>{topVisited&&<TopListingResearch initialOpen/>}</div>
      <div role="tabpanel" id="research-panel-upload" aria-labelledby="research-tab-upload" hidden={workspace!=="upload"}>
      <CsvBatchUpload onSaved={refresh}/><details><summary>Gelişmiş kelime yükleme · sütun, ülke ve dönem ayarları</summary><p>Dosyaları seç → sütunları kontrol et → önizle ve kaydet. Mevcut kayıtlar korunur.</p>
      <label>
        Kelime CSV dosyaları · en fazla 10 dosya, dosya başına 2 MB
        <input
          type="file"
          accept=".csv,text/csv"
          multiple
          disabled={busy}
          onChange={async (e) => {
            const chosen = Array.from(e.target.files || []);
            setFiles(chosen);
            setPreview([]);
            setConfigs([]);
            setMessage("");
            if (!chosen.length) return;
            setBusy(true);
            try {
              const x = await send("inspect", chosen);
              setConfigs(x.files);
              setMessage(
                "Dosyalar okundu. Eksik ülke ve ölçüm dönemini kontrol edip önizlemeyi aç.",
              );
            } catch (e) {
              setMessage(String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {configs.map((c, i) => (
        <details key={i} open={configs.length === 1}>
          <summary>
            {c.name} · {c.total} kaynak satırı
          </summary>
          <p>
            Dosyada bulunan ülke/tarih sütunları önceliklidir. Aşağıdakiler
            yalnız sütun yoksa kullanılır. Dönem yoksa “Bilinmiyor” bırak; o
            kayıtlar trend hesabına girmez.
          </p>
          <div className="columns">
            <label>
              Ülke / pazar
              <select
                value={c.settings.market}
                onChange={(e) => update(i, "market", e.target.value)}
              >
                {["unknown", "US", "UK", "CA", "AU", "Global"].map((x) => (
                  <option key={x} value={x}>
                    {x === "unknown" ? "Bilinmiyor" : x}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Veri türü
              <select
                value={c.settings.definition}
                onChange={(e) => update(i, "definition", e.target.value)}
              >
                <option value="unknown">Dönem tanımı bilinmiyor</option>
                <option value="rolling12">Son 12 ayın ortalaması</option>
                <option value="monthly">Gerçek aylık değer</option>
              </select>
            </label>
            <label>
              {c.settings.definition === "rolling12"
                ? "12 aylık dönemin son ayı"
                : "Veri dönemi (ay)"}
              <input
                type="month"
                value={c.settings.period}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => update(i, "period", e.target.value)}
              />
            </label>
            <label>
              eRank kontrol / dışa aktarma tarihi
              <input
                type="date"
                value={c.settings.observedAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update(i, "observedAt", e.target.value)}
              />
            </label>
            <label>
              Sayı biçimi
              <select
                value={c.settings.numberFormat}
                onChange={(e) => update(i, "numberFormat", e.target.value)}
              >
                <option value="auto">Otomatik — belirsizse durdur</option>
                <option value="en">İngilizce: 1,200.5</option>
                <option value="tr">Türkçe: 1.200,5</option>
              </select>
            </label>
            <label>
              Kaynak
              <select
                value={c.settings.source}
                onChange={(e) => update(i, "source", e.target.value)}
              >
                <option value="erank-keyword">
                  eRank anahtar kelime verisi
                </option>
                <option value="competitor-listing">
                  Rakip ilan verisi — ayrı saklanır
                </option>
                <option value="other">Diğer — ayrı saklanır</option>
              </select>
            </label>
            <label>
              Platform
              <select
                value={c.settings.platform}
                onChange={(e) => update(i, "platform", e.target.value)}
              >
                <option>Etsy</option>
                <option value="other">Diğer — ayrı saklanır</option>
              </select>
            </label>
          </div>
          <details>
            <summary>Sütun eşleştirmesini kontrol et</summary>
            <div className="columns">
              {Object.entries(labels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    value={c.settings.mapping[key] || ""}
                    onChange={(e) =>
                      update(i, "mapping", {
                        ...c.settings.mapping,
                        [key]: e.target.value,
                      })
                    }
                  >
                    <option value="">Sütun yok / dosya ayarını kullan</option>
                    {c.headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p>
              YYYY-AA başlıklı aylık arama sütunları otomatik açılır. Bu biçimde
              diğer ortalama metrikler aylık aramayla karıştırılmaz; bunları
              ayrı bir CSV’de yükleyebilirsin.
            </p>
          </details>
        </details>
      ))}
      {configs.length > 0 && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              const x = await send("preview");
              setPreview(x.files);
              setMessage("Önizleme hazır. Henüz aktarılmadı.");
            } catch (e) {
              setMessage(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Yükleme önizlemesini hazırla
        </button>
      )}
      {preview.map((p, i) => (
        <article key={i}>
          <strong>
            {p.name}
            {p.reused ? " · Bu dosya ve ayarlar zaten aktarılmış" : ""}
          </strong>
          <p>
            {p.stats.total} ölçüm satırı: {p.stats.valid} geçerli +{" "}
            {p.stats.invalid} hatalı + {p.stats.duplicates} dosya içi tekrar.
            Geçerli satırlardan {p.stats.newRows} yeni, {p.stats.repeated}{" "}
            öncekiyle aynı; {p.stats.revisions} farklı değerli sürüm.
          </p>
          <details>
            <summary>Örnek kayıtlar ve satır hataları</summary>
            {p.sample.map((s, j) => (
              <p key={j}>
                {s.term} · {s.market} · {s.period || "Dönem bilinmiyor"} · arama{" "}
                {s.metrics.searches.raw || "—"} · rekabet{" "}
                {s.metrics.competition.raw || "—"}
              </p>
            ))}
            {p.stats.errors.length > 0 && (
              <>
                <button
                  className="secondary"
                  onClick={() => {
                    const data = p.stats.errors
                      .map((e) => `${e.row}\t${e.error}`)
                      .join("\n");
                    const url = URL.createObjectURL(
                      new Blob([data], { type: "text/plain;charset=utf-8" }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "csv-satir-hatalari.txt";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Hatalı satır raporunu indir
                </button>
                {p.stats.errors.slice(0, 20).map((e, j) => (
                  <p key={j}>
                    Satır {e.row}: {e.error}
                  </p>
                ))}
              </>
            )}
          </details>
        </article>
      ))}
      {preview.length > 0 && (
        <>
          <label className="check-line">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
            />{" "}
            Hatalı satırlar varsa yalnız geçerli satırları aktar; hataları
            raporda koru.
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={revisions}
              onChange={(e) => setRevisions(e.target.checked)}
            />{" "}
            Aynı ölçüm için farklı değerleri yeni sürüm olarak kabul et; önceki
            değerleri koru.
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const x = await send("commit");
                setMessage(
                  `${x.files.length} dosya işlendi. Aynı kayıtlar yeniden eklenmedi; sonuç raporu güncellendi.`,
                );
                setPreview([]);
                setConfigs([]);
                setFiles([]);
                setWorkspace("report");
              } catch (e) {
                setMessage(String(e));
              } finally {
                await refresh().catch(() => {});
                setBusy(false);
              }
            }}
          >
            Geçmişe aktar ve raporu oluştur
          </button>
        </>
      )}
      <p role="status">
        {busy ? "İşleniyor… " : ""}
        {message}
      </p>
      </details></div>
      <div role="tabpanel" id="research-panel-report" aria-labelledby="research-tab-report" hidden={workspace!=="report"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          refresh().catch((e) => setMessage(e.message));
        }}
      >
        <div className="columns">
          <label>
            Rapor pazarı
            <select value={market} onChange={(e) => setMarket(e.target.value)}>
              {["US", "UK", "CA", "AU", "Global", "unknown"].map((v) => (
                <option key={v} value={v}>{v==="unknown"?"Ülkesi bilinmeyen kayıtlar":v}</option>
              ))}
            </select>
          </label>
          <label>
            Kelime / tasarım konusu
            <input
              value={query}
              maxLength={120}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Örn. forest"
            />
          </label>
        </div>
        <button type="submit" disabled={reportBusy}>{reportBusy ? "Rapor hazırlanıyor…" : "Kelime raporu oluştur"}</button>
        <p role="status" aria-live="polite">{reportMessage}</p>
      </form>
      {report && (
        <>
          <h3>
            Analiz özeti · {report.terms} kelime / {report.total} gözlem
          </h3>
          {report.sourceOverview && <section aria-label="Kelime kaynak raporu">
            <h3>Kaynak dosyalardaki ana kelimeler</h3>
            <p>{report.sourceOverview.notice}</p>
            {report.sourceOverview.sourceTerms.length > 0 ? <div style={{overflowX:"auto"}}><table><thead><tr><th>Kelime</th><th>Kaynakta arama</th><th>Tıklama</th><th>eRank CTR</th><th>Rekabet</th></tr></thead><tbody>{report.sourceOverview.sourceTerms.map(r => <tr key={r.term}><td>{r.term}</td><td>{r.searches.raw || "Bilinmiyor"}</td><td>{r.clicks.raw || "Bilinmiyor"}</td><td>{r.ctr.raw || "Bilinmiyor"}</td><td>{r.competition.raw || "Bilinmiyor"}</td></tr>)}</tbody></table></div> : <p>{report.terms ? "Bu filtrede ana kelime satırı eşleşmedi. Kaynak örneklerini aşağıdan açabilir veya kelime filtresini temizleyebilirsin." : "Bu filtrede kayıt yok. Rapor pazarını veya kelime filtresini değiştir."}</p>}
            <p>{report.unknown > 0 ? `${report.unknown} gözlemde ülke veya dönem bilinmiyor. Kaynak raporu oluşturuldu; bu kayıtlardan trend/başarı sonucu çıkarılmadı.` : "Kaynak değerleri ile dönemsel değişim bulguları ayrı değerlendirilir."}</p>
          </section>}
          <details><summary>Karşılaştırmalı sıralama yöntemi</summary><p>{report.method} Karşılaştırma grubu: {report.cohort}.</p></details>
          {report.metadataPending?.length>0&&<details><summary>Ülke / ölçüm dönemi doğrulanmayı bekleyen kayıtlar</summary><p>İlk 10 kaynak örneğidir; başarı veya fırsat sıralaması değildir. Bu değerlerden trend üretilmedi.</p>{report.metadataPending.map((r,i)=><p key={i}>{r.term} · kaynakta arama {r.searches||"bilinmiyor"} · rekabet {r.competition||"bilinmiyor"} · {r.sourceFile||r.source}, satır {r.row}</p>)}</details>}
          <details open>
            <summary>Karşılaştırmalı kelime adayları</summary>
            {report.opportunities.length ? (
              report.opportunities.map((r, i) => (
                <p key={i}>
                  <strong>{r.term}</strong> · {r.market} / {r.period} · arama{" "}
                  {r.searches ?? "—"} · rekabet {r.competition ?? "bilinmiyor"}
                  <br />
                  {r.reason} Kaynak: {r.sourceFile || r.source}, satır {r.row}.{" "}
                  {!r.tagEligible &&
                    "20 karakteri aşar; doğrudan Etsy tag olarak kullanma."}
                </p>
              ))
            ) : (
              <p>
                Kaynak raporu yukarıda hazır. Bu bölümdeki karşılaştırmalı sıralama için ülke ve ölçüm dönemi doğrulanmalı. Sıralama olmaması talebin sıfır olduğu anlamına gelmez.
              </p>
            )}
          </details>
          <details>
            <summary>
              Yükseliş / düşüş ve ölçüm değişimleri (en fazla 30 bulgu:{" "}
              {report.changes.length})
            </summary>
            {report.changes.map((r, i) => (
              <p key={i}>
                <strong>
                  {r.term} · {r.label}
                </strong>
                <br />
                {r.market} · {r.from} → {r.to}: {r.before} → {r.after} · fark{" "}
                {r.delta > 0 ? "+" : ""}
                {r.delta}
                {r.percent !== null
                  ? ` (%${r.percent})`
                  : "; başlangıç sıfır, yüzde hesaplanmadı"}
                .
                {r.lowBase &&
                  " Düşük başlangıç hacmi: yüzde tek başına güçlü sinyal değildir."}
                <br />
                Kaynak: {r.sourceFile || r.source}, satır {r.row}.{" "}
                {r.metric === "competition"
                  ? "Talep değişimi olarak yorumlama; ürün uyumuyla birlikte değerlendir."
                  : r.delta < 0
                    ? "Azalış sürüyorsa ilgili listing kelimelerini gözden geçir; tek değişimle çalışan ilanı değiştirme."
                    : "Tasarımla uyumluysa kontrollü listing denemesine aday; mevcut ilan otomatik değiştirilmez."}
              </p>
            ))}
            {!report.changes.length && (
              <p>
                Karşılaştırılabilir yeterli dönem yok; şu anda yükselen/düşen
                trend sonucu verilemiyor.
              </p>
            )}
          </details>
          <details>
            <summary>Yeni araştırma adayları</summary>
            {report.newCandidates.map((r, i) => (
              <p key={i}>
                {r.term} · {r.market} / {r.period} · arama {r.searches} ·
                rekabet {r.competition ?? "bilinmiyor"}. Başlangıç takip
                listesinde yok; motif/stil uyumunu kontrol ederek değerlendir.
              </p>
            ))}
          </details>
          <details><summary>Eksik veri nedeniyle sıralanmayan adaylar</summary>{report.incompleteCandidates?.map((r,i)=><p key={i}>{r.term} · rekabet bilinmiyor. Eksik bilgi sıfır sayılmadı; karşılaştırma puanı verilmedi.</p>)}</details>
          <details><summary>Değerlendirme kuralları</summary>{report.evidencePolicy?.rules.map((rule,i)=><p key={i}>{rule}</p>)}<p>Bu kelime verilerinden gerçek sipariş, yeni mağaza giriş kolaylığı veya başarı olasılığı hesaplanmaz.</p></details>
          <details>
            <summary>Dikkat gerektirenler</summary>
            {report.attention.map((r, i) => (
              <p key={i}>
                {r.term}: {r.reason}
              </p>
            ))}
            <p>
              Yüksek hacim tek başına doğru tag veya satış başarısı değildir.
              Mağazanın kendi gösterim/tıklama/satışları bu veriden çıkarılmaz.
            </p>
          </details>
          <details>
            <summary>Veri durumu ve sonraki adım</summary>
            {report.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
            <p>
              Sonraki yüklemede aynı ülke ve metrik tanımını kullan. Aylık trend
              için gerçek aylık seri ekle; farklı günlerde indirilmiş 12 ay
              ortalamaları aylık seri yerine geçmez. Sadece yüklediğin dosyalar
              analiz edilir; arka planda eRank izlenmez.
            </p>
          </details>
        </>
      )}
      <details><summary>Eski veri başlangıç raporu · 16 Ekim 2026 arşivi</summary><p>15.913 kelime ve 202 seçilmiş araştırma referansı değerlendirildi. 6.663 kelimede rekabet bilinmiyor. Bu arşivden güncel trend, gerçek sipariş veya başarı puanı çıkarılmadı.</p><p><a href="/reports/LOGESSA-Eski-Veri-Baslangic-Raporu.md" download>Başlangıç raporunu indir</a> · <a href="/reports/LOGESSA-Yeni-Veri-Kontrol-Listesi.csv" download>18 kelimelik yeni ölçüm kontrol listesini indir</a></p></details>
      </div>
      <details>
        <summary>Aktarım geçmişi · son 20 dosya</summary>
        {batches.map((b) => (
          <details key={b.id}>
            <summary>
              {b.file.name} · {new Date(b.createdAt).toLocaleString("tr-TR")}
            </summary>
            <p>
              {b.settings.market} · {b.settings.definition} ·{" "}
              {b.settings.period || "Dönem bilinmiyor"} ·{" "}
              {b.stats.inserted ?? b.stats.newRows} yeni ölçüm ·{" "}
              {b.stats.invalid} hatalı satır.
            </p>
            <a href={`/api/listing/csv?download=${b.fileSha}`}>
              Orijinal CSV’yi indir
            </a>
          </details>
        ))}
      </details>
    </section>
  );
}
