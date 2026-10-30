"use client";
import {englishAltSource,assertEnglishCustomerCopy} from "@/lib/listing-language";
import {ListingAltText} from "./listing-alt-text";
import {ListingMedia} from "./listing-media";
import { skuFromFilename } from "@/lib/listing-sku";
import { useVisiblePolling } from "./use-visible-polling";
import { AnalysisEngineChoice } from "./analysis-engine-choice";
import { WorkspaceNav } from "./workspace-nav";
import { ProductProfileEditor } from "./product-profile";
import { CsvResearch } from "./csv-research";
import { KeywordWatch } from "./keyword-watch";
import { useEffect, useState } from "react";
import { useListingFormDraft } from "./use-form-draft";
import type { ListingResult } from "@/lib/listing";
type Draft = {
  id: string;
  engine?: string;
  provider?: string;
  workerReady?: boolean;
  progress?: string;
  sku: string;
  notes: string;
  material: string;
  job?: {
    id: string;
    state: string;
    result: ListingResult | null;
    error: string | null;
  };
};
export function Listing() {
  const formDraft = useListingFormDraft();
  const [sourceAssetId, setSourceAssetId] = useState(""),
    [linkedTitle, setLinkedTitle] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const id = query.get("design");
    const asset = query.get("asset");
    if (!id) return;
    let cancelled = false;
    fetch(`/api/listing/design-context?design=${encodeURIComponent(id)}${asset ? `&asset=${encodeURIComponent(asset)}` : ""}`)
      .then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw Error(x.error);
        return x;
      })
      .then((x) => {
        if (cancelled) return;
        setLinkedTitle(x.title);
        setSourceAssetId(x.asset?.id || "");
        const form = formDraft.current;
        if (form) {
          for (const name of ["sku", "subject", "color", "style", "product"]) {
            const field = form.elements.namedItem(name) as
              HTMLInputElement | HTMLSelectElement | null;
            if (field && typeof x[name] === "string") field.value = x[name];
          }
          form.dispatchEvent(new Event("input", { bubbles: true }));
        }
      })
      .catch((e) => setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, []);
  const [workspace, setWorkspace] = useState("create");
  const [researchVisited, setResearchVisited] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (location.hash === "#product-profile") setWorkspace("settings");
      else if (location.hash === "#csv-research") {
        setWorkspace("research");
        setResearchVisited(true);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [profileMaterials, setProfileMaterials] = useState<string[]>([]);
  useEffect(() => {
    const load = () => {
      fetch("/api/product-profile")
        .then((r) => r.json())
        .then((x) =>
          setProfileMaterials(
            x.data.confirmed
              ? x.data.materials.map((m: { name: string }) => m.name)
              : [],
          ),
        )
        .catch(() => {});
    };
    load();
    window.addEventListener("qoop-profile-updated", load);
    return () => window.removeEventListener("qoop-profile-updated", load);
  }, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [trash, setTrash] = useState(false);
  const [removing, setRemoving] = useState(false);
  async function changeSelected(restore = false) {
    setRemoving(true);
    try {
      const r = await fetch("/api/listing/selection", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:selected,restore})});
      const x = await r.json(); if (!r.ok) throw Error(x.error);
      setSelected([]); await refresh(); setMessage(restore ? "Seçilen taslaklar geri alındı." : "Seçilen taslaklar silinenlere taşındı. Tasarım ve görseller korundu.");
    } catch(e) {setMessage(e instanceof Error ? e.message : "İşlem yapılamadı.");}
    finally {setRemoving(false);}
  }
  const [latestId, setLatestId] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("draft");
    if (id) setLatestId(id);
  }, []);
  const [records, setRecords] = useState<{ id: string; sku: string }[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [dataStatus, setDataStatus] = useState<{
      total: number;
      manual: number;
    } | null>(null);
  async function refreshData() {
    const r = await fetch("/api/listing/keywords");
    if (r.ok) setDataStatus(await r.json());
  }
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  async function refresh() {
    try {
      const r = await fetch(`/api/listing?summary=1&page=${page}&trash=${trash ? 1 : 0}`);
      if (!r.ok) throw Error();
      const data = await r.json();
      setRecords(data.items);
      setPages(data.pages);
      if (page !== data.page) setPage(data.page);
    } catch {
      setMessage("Listing kayıtları okunamadı.");
    }
  }
  useEffect(() => {
    refresh();
  }, [page, trash]);
  useEffect(() => {
    refreshData().catch(() => {});
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <>
      <header>
        <h1>Listing</h1>
        <a href="/listing/keywords">CSV kelime tablosu ve fırsatlar →</a>
        <p>
          Tasarımını satışa hazır bir anlatıma dönüştür. Başlık, 13 etiket ve
          açıklamayı tek taslakta hazırla.
        </p>
      </header>
      <WorkspaceNav
        prefix="listing"
        value={workspace}
        onChange={(v) => {
          setWorkspace(v);
          if (v === "research") setResearchVisited(true);
        }}
        items={[
          {
            id: "create",
            label: "Listing hazırla",
            description: "Başlık, etiket ve açıklama",
          },
          {
            id: "research",
            label: "Araştırma verileri",
            description: "CSV yükle, kelimeleri incele",
          },
          {
            id: "settings",
            label: "Ürün ayarları",
            description: "Malzeme ve baskı koşulları",
          },
        ]}
      />
      <div
        role="tabpanel"
        id="listing-panel-research"
        aria-labelledby="listing-tab-research"
        hidden={workspace !== "research"}
      >
        {researchVisited && (
          <>
            <a href="/listing/keywords">CSV kelime tablosu ve fırsat kartlarını aç →</a>
            <CsvResearch />
            <details>
              <summary>İsteğe bağlı kelime takibi ve tekil giriş</summary>
              <KeywordWatch />
            </details>
          </>
        )}
      </div>
      <div
        role="tabpanel"
        id="listing-panel-settings"
        aria-labelledby="listing-tab-settings"
        hidden={workspace !== "settings"}
      >
        <div className="task-intro">
          <h2>Ürün bilgilerini bir kez tanımla</h2>
          <p>
            Malzeme, ölçü ve teslimat bilgilerini doğrula. Sonraki listinglerde
            aynı profil kullanılır.
          </p>
        </div>
        <ProductProfileEditor />
      </div>
      <div
        role="tabpanel"
        id="listing-panel-create"
        aria-labelledby="listing-tab-create"
        hidden={workspace !== "create"}
      >
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YENİ TASLAK</p>
              <h2>{sourceAssetId ? "Kayıtlı görselden listing hazırla" : "Görseli yükle, listing’i hazırla"}</h2>
            </div>
            <span className="status-pill">Görsel analizi</span>
          </div>
          <form
            ref={formDraft}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (busy) return;
              setBusy(true);
              try {
                const r = await fetch("/api/listing", {
                  method: "POST",
                  body: new FormData(form),
                });
                const x = await r.json();
                if (!r.ok) throw Error(x.error);
                setMessage(
                  x.reused
                    ? "Aynı görsel ve veriler için kayıtlı çalışma açıldı."
                    : "Görsel analizi sıraya alındı. Sonuç aşağıdaki kayıtta açılacak.",
                );
                setLatestId(x.id);
                form.reset();
                setFile(null);
                setSourceAssetId("");
                setLinkedTitle("");
                if (page === 1) await refresh();
                else setPage(1);
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Kaydedilemedi.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input type="hidden" name="sourceAssetId" value={sourceAssetId} />
            {linkedTitle && (
              <div className="linked-design">
                <strong>{linkedTitle}</strong>
                <p>
                  {sourceAssetId
                    ? "Kayıtlı görsel ve SKU bağlandı. Görselin içeriği otomatik okunacak."
                    : "SKU bağlandı. Üretim görselini seçerek devam et."}
                </p>
                {sourceAssetId && (
                  <img
                    className="listing-thumb"
                    src={`/api/assets/${sourceAssetId}/preview?mode=thumb`}
                    alt="Bağlı tasarım"
                  />
                )}
              </div>
            )}
            <div className="columns">
              <label>
                SKU · dosya adından otomatik
                <input
                  name="sku"
                  pattern="[A-Z0-9][A-Z0-9-]{2,59}"
                  placeholder="LOGESSA-…"
                  maxLength={60}
                />
              </label>
              {!sourceAssetId ? <label>
                Görsel
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff"
                  required={!sourceAssetId}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f) {
                      setSourceAssetId("");
                      try {
                        const field = formDraft.current?.elements.namedItem(
                          "sku",
                        ) as HTMLInputElement | null;
                        if (field) field.value = skuFromFilename(f.name) || "";
                        setMessage("");
                      } catch (err) {
                        setMessage(
                          err instanceof Error
                            ? err.message
                            : "Dosya adını kontrol et.",
                        );
                      }
                    }
                  }}
                />
              </label> : <div><p>Kayıtlı görsel kullanılacak; yeniden yüklemene gerek yok.</p><button type="button" className="secondary" onClick={()=>setSourceAssetId("")}>Farklı bir görsel seç</button></div>}
            </div>
            {preview && (
              <img
                className="listing-thumb"
                src={preview}
                alt="Listing görseli"
              />
            )}
            <p>
              Görseldeki motif, renk ve kompozisyon varsayılan olarak bu Mac’te
              okunur; uygun eRank kelimelerinden başlık, 13 etiket ve açıklama
              hazırlanır. Dosya adında SKU yoksa LOGESSA kodu otomatik atanır.
            </p>
            <AnalysisEngineChoice />
            <details>
              <summary>İsteğe bağlı not ve ürün bilgileri</summary>
              <label>
                Ek isteğin
                <textarea
                  name="notes"
                  maxLength={3000}
                  placeholder="İsteğe bağlı. Görselin motif ve renklerini yazman gerekmiyor."
                />
              </label>
              <label>
                Ürün türü
                <select name="product" defaultValue="auto">
                  <option value="auto">Görselden öner</option>
                  <option value="wall mural">Mural</option>
                  <option value="wallpaper">Duvar kâğıdı / pattern</option>
                </select>
              </label>
              <label>
                Doğrulanmış malzeme
                <select name="profileMaterial">
                  <option value="">Ürün profilini kullan</option>
                  {profileMaterials.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </details>
            <p className="muted">
              Tasarım için AI destekli üretim ve Photoshop düzenlemesi;
              mockuplar için AI kullanımı ayrı belirtilir. Dış model yalnız açık
              seçiminle kullanılır.
            </p>
            <button disabled={busy}>
              {busy ? "Yükleniyor…" : "Listing taslağını oluştur"}
            </button>
            <p role="status">{message}</p>
          </form>
        </section>
        <p>
          {dataStatus
            ? `${dataStatus.total.toLocaleString("tr-TR")} eski arşiv kelimesi + yüklediğin CSV kaynakları · ${dataStatus.manual.toLocaleString("tr-TR")} kelime manuel verilerle güncellendi.`
            : "Yerel kelime veritabanı yükleniyor…"}
        </p>

        <div className="section-heading">
          <h2>Listing taslaklarım</h2>
          <span className="muted">Ayrıntıları açarak incele</span>
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => {setTrash(!trash); setPage(1); setSelected([]);}}>{trash ? "Aktif taslaklara dön" : "Silinenler"}</button>
          <label><input type="checkbox" checked={records.length > 0 && records.every(d => selected.includes(d.id))} onChange={e => setSelected(e.target.checked ? records.map(d => d.id) : [])} /> Bu sayfadakileri seç</label>
          <button className="secondary" disabled={!selected.length || removing} onClick={() => changeSelected(trash)}>{trash ? "Seçilenleri geri al" : "Seçilenleri sil"} ({selected.length})</button>
        </div>
        {trash && <p>Buradaki taslaklar geri alınabilir. Tasarımlar, SKU ve görseller silinmez.</p>}
        {records.map((d) => (
          <div key={d.id}>
          <label><input type="checkbox" aria-label={`${d.sku} taslağını seç`} checked={selected.includes(d.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev,d.id] : prev.filter(id => id !== d.id))} /> Seç · {d.sku}</label>
          <ListingHistory
            key={d.id}
            summary={d}
            setMessage={setMessage}
            autoOpen={d.id === latestId}
            active={workspace === "create" && !trash}
          />
          </div>
        ))}
        {pages > 1 && (
          <nav className="pagination" aria-label="Listing geçmişi sayfaları">
            <button
              className="secondary"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Daha yeni
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              className="secondary"
              disabled={page >= pages || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Daha eski →
            </button>
          </nav>
        )}
        <p>
          Sonuçlar taslaktır; Etsy’ye otomatik yayınlanmaz. Araştırma tarihleri
          sonuçta belirtilir.
        </p>
      </div>
    </>
  );
}

function ListingHistory({
  summary,
  setMessage,
  autoOpen = false,
  active = true,
}: {
  summary: { id: string; sku: string };
  autoOpen?: boolean;
  active?: boolean;
  setMessage: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [d, setDraft] = useState<Draft | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  useEffect(() => {
    if (!open || d) return;
    let cancelled = false;
    fetch(`/api/listing/${summary.id}`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((x) => {
        if (!cancelled) setDraft(x);
      })
      .catch(() => {
        if (!cancelled)
          setError("Kayıt açılamadı; kapatıp yeniden açabilirsin.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, d, summary.id]);
  async function load() {
    try {
      const r = await fetch(`/api/listing/${summary.id}`);
      if (r.ok) setDraft(await r.json());
    } catch {
      setError("Sonuç güncellenemedi.");
    }
  }
  useVisiblePolling(
    load,
    active && open && !!d?.job && ["PENDING", "RUNNING"].includes(d.job.state),
  );
  return (
    <details
      open={open}
      className="analysis-history"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{summary.sku}</summary>
      {open &&
        (d ? (
          <section>
            {" "}
            <div className="columns">
              <div>
                <img
                  className="listing-thumb"
                  src={`/api/listing/${d.id}/image`}
                  alt={`${d.sku} görseli`}
                />
                <h3>{d.sku}</h3>
                <small>
                  {d.engine === "vision"
                    ? d.provider === "local"
                      ? "LOGESSA · Mac üzerinde yerel görsel okuması"
                      : d.provider === "claude"
                        ? "Claude · bu işlem için izin verildi"
                        : "Önceki görsel okuması · korunuyor"
                    : d.engine === "local"
                      ? "Önceki tarif motoru · korunuyor"
                      : "Önceki model taslağı · korunuyor"}
                </small>
              </div>
              <div>
                {d.job?.state !== "SUCCEEDED" && (
                  <p role="status">
                    {d.job?.state === "FAILED"
                      ? d.job.error
                      : d.job?.state === "RUNNING"
                        ? d.progress === "MATCHING_KEYWORDS"
                          ? "Görsel okundu. eRank eşleşmeleriyle listing yazılıyor…"
                          : "Görseldeki motifler, renkler ve kompozisyon okunuyor…"
                        : d.workerReady
                          ? "Analiz sırası bekleniyor…"
                          : d.provider === "claude"
                            ? "Seçtiğin Claude köprüsü bağlı değil; otomatik başka servis kullanılmaz."
                            : "Yerel model hazırlanıyor veya servis bağlı değil. Claude’a geçilmeyecek."}
                  </p>
                )}
                {d.engine === "vision" && d.job?.state === "FAILED" && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      const r = await fetch(`/api/listing/${d.id}/retry`, {
                        method: "POST",
                      });
                      if (r.ok) await load();
                      else setMessage("Yeniden başlatılamadı.");
                    }}
                  >
                    Yeniden dene · önbelleği kullan
                  </button>
                )}
                {d.job?.result && (
                  <>
                    <p>{englishAltSource(d.job.result.description)}</p>
                    <details><summary>İç analiz notları · Türkçe (Etsy metnine dahil değil)</summary><p>{d.job.result.visualSummary}</p>
                    {d.job.result.visual && (
                      <p className="muted">
                        {d.job.result.visual.motifs.join(" · ")} /{" "}
                        {d.job.result.visual.colors.join(" · ")}
                      </p>
                    )}
                    </details>
                    {d.job.result.quality && (
                      <small>
                        {d.job.result.quality.titleCharacters}/140 karakter ·{" "}
                        {d.job.result.quality.tagCount} etiket · görsel okundu
                      </small>
                    )}
                    {d.job.result.reviewStatus && (
                      <p className="muted">
                        <strong>
                          {d.job.result.reviewStatus === "NEEDS_REVIEW"
                            ? "Taslak hazır · kontrol gerekli"
                            : "Taslak hazır"}
                        </strong>
                        {d.job.result.checks
                          ?.filter((c) => c.state !== "CONFIRMED")
                          .slice(0, 3)
                          .map((c) => (
                            <span key={c.id}>
                              {" "}
                              · {c.label}:{" "}
                              {c.state === "UNKNOWN"
                                ? "bilgi/onay bekliyor"
                                : "hata"}
                            </span>
                          ))}
                      </p>
                    )}
                    <h3>Title · English</h3>
                    <p>{d.job.result.title}</p>
                    <ListingAltText id={d.id} description={d.job.result.description.split("Design details:")[0]} />
                    <h3>Tags · English</h3>
                    <button onClick={async () => {
                      try {
                        const response = await fetch(`/api/listing/${d.id}/tags`, {method:"POST"});
                        const body = await response.json();
                        if (!response.ok) throw Error(body.error);
                        setMessage("Etiketler çeşitlendirildi. Görsel yeniden analiz edilmedi.");
                        window.location.reload();
                      } catch(e) { setMessage(e instanceof Error ? e.message : "Etiketler güncellenemedi."); }
                    }}>Etiketleri çeşitlendir · AI kullanmaz</button>
                    <div className="tags">
                      {d.job.result.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <label>Tags (English) · comma-separated
                      <textarea readOnly rows={3} value={d.job.result.tags.join(", ")} />
                    </label>
                    <button onClick={async () => {
                      try { await navigator.clipboard.writeText(d.job!.result!.tags.join(", ")); setMessage("Etiketler kopyalandı."); }
                      catch { setMessage("Kopyalanamadı; etiket alanından seçip kopyalayabilirsin."); }
                    }}>Copy tags</button>
                    <ListingMedia id={d.id} product={(d.job?.result?.visual as any)?.product}/>
                    <h3>Description · English</h3>
                    {!!d.job.result.missingSections?.length && (
                      <p role="status">
                        Şablon bölümleri korundu. Bilgi bekleyen alanlar:{" "}
                        {d.job.result.missingSections.join(" · ")}. Ürün
                        ayarlarından tamamlanabilir; boş alanlara örnek değer
                        aktarılmadı.
                      </p>
                    )}
                    <p className="listing-result">{d.job.result.description}</p>
                    <button
                      onClick={async () => {
                        try {
                          const r = d.job!.result!;
                          assertEnglishCustomerCopy(r);
                          await navigator.clipboard.writeText(
                            `${r.title}\n\n${r.tags.join(", ")}\n\n${r.description}`,
                          );
                          setMessage("Listing kopyalandı.");
                        } catch {
                          setMessage("Metni seçerek kopyalayabilirsin.");
                        }
                      }}
                    >
                      Listing metnini kopyala
                    </button>
                    {d.job.result.publication && (
                      <details>
                        <summary>
                          SSS, varyasyonlar, görsel seti ve yayın kontrolleri
                        </summary>
                        <p>
                          Profil sürümü:{" "}
                          {d.job.result.publication.profileId || "Tanımlanmadı"}
                          . Bu paket taslaktır; otomatik yayın yok.
                        </p>
                        {d.job.result.publication.faq.map((f, i) => (
                          <p key={i}>
                            <strong>{f.question}</strong>
                            <br />
                            {f.answer}
                          </p>
                        ))}
                        {d.job.result.publication.variations.map((v, i) => (
                          <p key={i}>
                            {v.name}: {v.options.join(" · ")}
                          </p>
                        ))}
                        <h4>Görsel seti planı</h4>
                        {d.job.result.publication.imagePlan.map((a) => (
                          <p key={a.id}>
                            {a.label}: {a.brief}
                          </p>
                        ))}
                        <h4>Yayın öncesi</h4>
                        {d.job.result.publication.checks.map((c, i) => (
                          <p key={i}>{c}</p>
                        ))}
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(
                                JSON.stringify(
                                  d.job!.result!.publication,
                                  null,
                                  2,
                                ),
                              )
                              .then(() =>
                                setMessage("Yayın paketi kopyalandı."),
                              )
                              .catch(() =>
                                setMessage("Metni seçerek kopyalayabilirsin."),
                              )
                          }
                        >
                          Yayın paketi ayrıntılarını kopyala
                        </button>
                      </details>
                    )}
                    <details>
                      <summary>Veri dayanağı ve kontrol edilecekler</summary>
                      <p>{d.job.result.rationale}</p>
                      {d.job.result.checks && (
                        <>
                          <h4>Kalite kontrolleri</h4>
                          {d.job.result.checks.map((c) => (
                            <p key={c.id}>
                              <strong>
                                {c.label} ·{" "}
                                {c.state === "CONFIRMED"
                                  ? "Doğrulandı"
                                  : c.state === "UNKNOWN"
                                    ? "Bilinmiyor / kontrol gerekli"
                                    : "Hata"}
                              </strong>
                              <br />
                              {c.detail}
                            </p>
                          ))}
                        </>
                      )}
                      {d.job.result.uncertainties &&
                        d.job.result.uncertainties.length > 0 && (
                          <>
                            <h4>Gözlem ve yorum sınırları</h4>
                            <ul>
                              {d.job.result.uncertainties.map((u, i) => (
                                <li key={i}>{u}</li>
                              ))}
                            </ul>
                          </>
                        )}

                      {d.job.result.tagEvidence && (
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Etiket</th>
                                <th>Dayanak</th>
                                <th>Tarih / pazar / dönem</th>
                                <th>Arama / rekabet</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.job.result.tagEvidence.map((t) => (
                                <tr key={t.tag}>
                                  <td>{t.tag}</td>
                                  <td>
                                    {t.origin === "research"
                                      ? `${t.sourceFile}${t.sourceRow ? " · satır " + t.sourceRow : ""}`
                                      : "Görselden öneri · eRank verisi yok"}
                                  </td>
                                  <td>
                                    {t.sourceDate || "Bilinmiyor"}
                                    <br />
                                    {t.market === "unknown"
                                      ? "Pazar bilinmiyor"
                                      : t.market}
                                    {t.period ? " · " + t.period : ""}
                                    {t.definition && t.definition !== "unknown"
                                      ? " · " + t.definition
                                      : ""}
                                  </td>
                                  <td>
                                    {t.searches || "—"} / {t.competition || "—"}
                                    {!t.rankingAllowed && (
                                      <small>
                                        {" "}
                                        · Talep sıralaması için doğrulanmadı
                                      </small>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <ul>
                        {d.job.result.warnings.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      {d.job.result.warnings.length > 3 && (
                        <details>
                          <summary>
                            Diğer notlar ({d.job.result.warnings.length - 3})
                          </summary>
                          <ul>
                            {d.job.result.warnings.slice(3).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </details>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <p>{error || "Kayıt yükleniyor…"}</p>
        ))}
    </details>
  );
}
