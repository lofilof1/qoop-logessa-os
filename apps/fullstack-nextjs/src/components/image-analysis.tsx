"use client";
import { AnalysisEngineChoice } from "./analysis-engine-choice";
import { WorkspaceNav } from "./workspace-nav";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { resolution } from "@/lib/analysis";
import { PromptApproval } from "./prompt-approval";
import { ProviderPrompts } from "./provider-prompts";
import { reviewProviderPrompts } from "@/lib/provider-prompts";
import { useLocalDraft } from "./use-local-draft";
import { useVisiblePolling } from "./use-visible-polling";
import { shouldPollAnalysis } from "@/lib/efficiency";
import type { ReviewResult } from "@/lib/analysis-review";
export type AnalysisRecord = {
  sequence?: number;
  id: string;
  title: string;
  mode: string;
  focus: string;
  notes: string;
  report: string;
  width: number;
  height: number;
  wallWidth: number | null;
  wallHeight: number | null;
  name: string;
};
type Snapshot = {
  job: null | {
    id: string;
    state: string;
    provider?: string;
    queuePosition?: number;
    result: ReviewResult | null;
    error: string | null;
  };
  worker: { online: boolean; message: string };
};
const criteriaNames = {
  density: "Yoğunluk ve sakin alan",
  palette: "Renk ve kontrast",
  composition: "Kompozisyon ve akış",
  hierarchy: "Ana / destek motif oranları",
  style: "Stil ve ortak görsel dil",
  technical: "Teknik riskler",
};
function Record({ a, active }: { a: AnalysisRecord; active: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(a.report);
  useLocalDraft(
    `qoop-analysis-note:${a.id}`,
    { base: a.report, value: report },
    (raw) => {
      const draft = raw as { base?: unknown; value?: unknown };
      if (draft?.base === a.report && typeof draft.value === "string")
        setReport(draft.value);
    },
  );
  const metrics = resolution(a.width, a.height, a.wallWidth, a.wallHeight);
  const refreshing = useRef(false);
  async function refresh() {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const r = await fetch(`/api/analysis/${a.id}/run`);
      if (!r.ok) throw Error();
      setSnapshot(await r.json());
    } catch {
      setMessage("Analiz durumu okunamadı; görsel kaydın korunuyor.");
    } finally {
      refreshing.current = false;
    }
  }
  useEffect(() => {
    refresh();
  }, [a.id]);
  const state = snapshot?.job?.state;
  useVisiblePolling(refresh, shouldPollAnalysis(active, state));
  const result = snapshot?.job?.result;
  async function run(retry = false) {
    setBusy(true);
    try {
      const r = await fetch(`/api/analysis/${a.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retry }),
      });
      if (!r.ok) throw Error();
      setSnapshot(await r.json());
      setMessage("");
    } catch {
      setMessage("Analiz başlatılamadı; tekrar kontrol et.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="source-card">
      <h2>{a.title}</h2>
      <div className="columns">
        <div>
          <img
            src={`/api/analysis/${a.id}/image`}
            alt={a.title}
            style={{
              width: 160,
              maxWidth: "100%",
              maxHeight: 120,
              objectFit: "contain",
            }}
          />
          <p>
            {a.width} × {a.height} px
          </p>
          <a href={`/api/analysis/${a.id}/image?original=1`}>Orijinali indir</a>
        </div>
        <div>
          <h3>
            {state === "SUCCEEDED"
              ? "Rapor ve düzeltilmiş prompt hazır"
              : state === "RUNNING"
                ? "Görsel ders ölçütleriyle inceleniyor…"
                : state === "PENDING"
                  ? `Analiz sırası: ${snapshot?.job?.queuePosition || "—"}`
                  : state === "FAILED"
                    ? "Analiz tamamlanamadı"
                    : "Analiz bekliyor"}
          </h3>
          {(state === "PENDING" || state === "RUNNING") && (
            <p>
              Rapor ve prompt aynı incelemede hazırlanıyor. Sayfayı açık tutman
              gerekmez. Tekrar basmak yeni model çağrısı oluşturmaz.
            </p>
          )}
          {snapshot && !snapshot.worker.online && state !== "SUCCEEDED" && (
            <p role="alert">{snapshot.worker.message}</p>
          )}
          {state === "RUNNING" && <p>Yerel görsel analizi birkaç dakika sürebilir. Diğer kayıtlar sırayla işlenir.</p>}
          {state === "PENDING" && snapshot?.job?.provider === "claude" && <button disabled={busy} onClick={()=>run()}>Bu kaydı yerel modelle işle</button>}
          {snapshot?.job?.error && <p role="alert">{snapshot.job.error}</p>}
          {(!state || state === "FAILED") && (
            <button disabled={busy} onClick={() => run(state === "FAILED")}>
              {busy
                ? "Başlatılıyor…"
                : state === "FAILED"
                  ? "Yerel modelle yeniden dene"
                  : "Bu görseli analiz et"}
            </button>
          )}
          <details>
            <summary>Ölçülen teknik bilgiler</summary>
            <p>
              Orijinal dosya: {a.name}. En/boy: {metrics.ratio}.
            </p>
            <p>
              {metrics.ppiX !== null && metrics.ppiY !== null
                ? `Hedef ${a.wallWidth} × ${a.wallHeight} cm: yatay ${metrics.ppiX}, dikey ${metrics.ppiY} PPI.`
                : "Fiziksel ölçü girilmediği için efektif PPI hesaplanmadı."}
            </p>
            <p>
              Bu değerler yerel ölçümdür. Renk kaplaması ve motif yoğunluğu
              yorumları görsel tahmindir; otomatik segmentasyon ölçümü değildir.
            </p>
          </details>
        </div>
      </div>
      {result && state === "SUCCEEDED" && (
        <>
          <h3>Analiz raporu</h3>
          <p>
            {result.summary
              .split(/(?<=[.!?])\s+/)
              .slice(0, 2)
              .join(" ")}
          </p>
          {result.summary.length > 500 && (
            <details>
              <summary>Tam rapor özeti</summary>
              <p>{result.summary}</p>
            </details>
          )}
          <details>
            <summary>Ayrıntılı değerlendirme ve ders kanıtları</summary>
            <div className="research-grid">
              {result.criteria.map((c) => (
                <section key={c.criterion}>
                  <h3>{criteriaNames[c.criterion]}</h3>
                  <p>{c.observation}</p>
                  <p>
                    <b>Görsel kanıt:</b> {c.evidence}
                  </p>
                  <p>
                    <b>Düzeltme:</b> {c.recommendation}
                  </p>
                  <small>
                    Güven:{" "}
                    {
                      { high: "yüksek", medium: "orta", low: "düşük" }[
                        c.confidence
                      ]
                    }{" "}
                    · Ders PDF s.{" "}
                    {c.lessonPages.map((p, i) => (
                      <span key={p}>
                        {i ? ", " : ""}
                        <a
                          href={`/lessons/course.pdf#page=${p}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p}
                        </a>
                      </span>
                    ))}
                  </small>
                </section>
              ))}
            </div>
          </details>
          <h3>Korunacak özellikler</h3>
          <ul>
            {result.preserve.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <details>
            <summary>Güçlü yanlar</summary>
            <ul>
              {result.strengths.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </details>
          <h3>Öncelikli üç düzeltme</h3>
          <ol>
            {result.priorities.map((x, i) => (
              <li key={i}>
                <b>{x.issue}</b>
                <p>{x.action}</p>
                <small>Yöntem / araç: {x.tool}</small>
              </li>
            ))}
          </ol>
          <h3>Düzeltilmiş üretim promptları</h3>
          <ProviderPrompts
            prompts={reviewProviderPrompts(
              result.correctedPrompt,
              result.negativePrompt,
              `${a.wallWidth || a.width}:${a.wallHeight || a.height}`,
              a.mode,
            )}
          />
          <PromptApproval
            key={snapshot.job!.id}
            analysisId={a.id}
            jobId={snapshot.job!.id}
          />
          <details>
            <summary>Kaçınılacak öğeler ve kontrol sınırları</summary>
            <p>{result.negativePrompt}</p>
            <ul>
              {result.limits.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
            <p>
              Görsel 1600 px’i aşmayan inceleme kopyasıyla yorumlandı. Seam ve
              fiziksel baskı testi çalıştırılmadı.
            </p>
          </details>
        </>
      )}
      <details>
        <summary>Kendi notlarım / önceki raporum</summary>
        <textarea
          aria-label={`${a.title} kendi notlarım`}
          rows={5}
          value={report}
          maxLength={50000}
          onChange={(e) => setReport(e.target.value)}
        />
        <button
          onClick={async () => {
            try {
              const r = await fetch(`/api/analysis/${a.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ report }),
              });
              if (!r.ok) throw Error();
              setMessage("Notların kaydedildi.");
            } catch {
              setMessage("Notlar kaydedilemedi; metin ekranda korunuyor.");
            }
          }}
        >
          Notlarımı kaydet
        </button>
      </details>
      <p role="status">{message}</p>
    </article>
  );
}
type AnalysisSummary = { id: string; sequence?: number };
function AnalysisHistory({
  a,
  visible = true,
  autoOpen = false,
}: {
  a: AnalysisSummary;
  visible?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [record, setRecord] = useState<AnalysisRecord | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  useEffect(() => {
    if (!open || record) return;
    let cancelled = false;
    fetch(`/api/analysis/${a.id}`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((x) => {
        if (!cancelled) setRecord(x);
      })
      .catch(() => {
        if (!cancelled)
          setError("Kayıt açılamadı. Kapatıp yeniden açabilirsin.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, a.id, record]);
  return (
    <details
      id={`analysis-${a.id}`} open={open}
      className="analysis-history"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary aria-label={`İnceleme ${a.sequence ?? ""} · aç veya kapat`}>
        {String(a.sequence ?? 0).padStart(4, "0")}
      </summary>
      {record ? (
        <Record a={record} active={open && visible} />
      ) : open ? (
        <p>{error || "Kayıt yükleniyor…"}</p>
      ) : null}
    </details>
  );
}
export function ImageAnalysis({ records }: { records: AnalysisSummary[] }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState("new"),
    [createdId, setCreatedId] = useState("");
  useEffect(()=>{const sync=()=>{if(location.hash.startsWith("#analysis-")){setCreatedId(location.hash.slice(10));setWorkspace("history");}};sync();window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync);},[]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  useEffect(() => {
    if (
      !file ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <>
      <WorkspaceNav
        prefix="analysis"
        value={workspace}
        onChange={setWorkspace}
        items={[
          {
            id: "new",
            label: "Görsel yükle",
            description: "Yeni bir inceleme başlat",
          },
          {
            id: "history",
            label: "Raporlarım",
            description: "İncele, promptu onayla ve devam et",
          },
        ]}
      />
      <div
        role="tabpanel"
        id="analysis-panel-new"
        aria-labelledby="analysis-tab-new"
        hidden={workspace !== "new"}
      >
        <section>
          <p className="eyebrow">YENİ İNCELEME</p>
          <h2>Görselini yükle, geliştirme yolunu gör</h2>
          <p>
            Ders ölçütleriyle yoğunluk, renk, kompozisyon, motif hiyerarşisi ve
            stil incelenir. Sonuç arşivde saklanır; aynı görsel ve ölçütler için
            yeniden model çağrısı yapılmaz.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setBusy(true);
              setMessage("");
              try {
                const data = new FormData(form);
                if (!String(data.get("title") || "").trim())
                  data.set(
                    "title",
                    (file?.name || "Görsel incelemesi")
                      .replace(/\.[^.]+$/, "")
                      .slice(0, 160),
                  );
                const r = await fetch("/api/analysis", {
                  method: "POST",
                  body: data,
                });
                const x = await r.json();
                if (!r.ok) throw Error(x.error);
                setMessage(
                  x.reused
                    ? "Aynı görsel ve ölçütlerle kayıt zaten var; mevcut inceleme korundu."
                    : x.analysisQueued
                      ? "Görsel kaydedildi. Analiz raporu ve düzeltilmiş prompt hazırlanacak."
                      : "Görsel kaydedildi. Aşağıdaki karttan analizi başlat.",
                );
                form.reset();
                setFile(null);
                setCreatedId(x.id);
                setWorkspace("history");
                router.refresh();
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Yükleme başarısız.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Görsel dosyası
              <input
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <small>
              PNG / JPEG / WebP / TIFF · En fazla 30 MB. PSD için PNG önizleme
              dışa aktar.
            </small>
            {preview && (
              <img
                src={preview}
                alt="Yüklenecek görsel"
                style={{ maxWidth: 160, maxHeight: 120 }}
              />
            )}
            <label>
              Tasarım türü
              <select name="mode">
                <option value="auto">Görsele göre değerlendir</option>
                <option value="pattern">Seamless pattern</option>
                <option value="mural">Mural</option>
                <option value="continuous">Seamless mural</option>
                <option value="motif">Tekil motif / set</option>
              </select>
            </label>
            <details>
              <summary>
                Özel hedef veya korunacak özellik ekle (isteğe bağlı)
              </summary>
              <label>
                Çalışma adı
                <input
                  name="title"
                  maxLength={160}
                  placeholder="Boşsa dosya adı kullanılır"
                />
              </label>
              <input
                name="focus"
                type="hidden"
                value="Ders ölçütleriyle kapsamlı görsel analiz ve düzeltme planı"
              />
              <label>
                Özel talep
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={5000}
                  placeholder="Örn. renkler korunsun, yoğunluk azalsın. Boş bırakabilirsin."
                />
              </label>
              <div className="columns">
                <label>
                  Hedef en (cm)
                  <input
                    name="wallWidth"
                    type="number"
                    min={1}
                    max={10000}
                    step="any"
                  />
                </label>
                <label>
                  Hedef boy (cm)
                  <input
                    name="wallHeight"
                    type="number"
                    min={1}
                    max={10000}
                    step="any"
                  />
                </label>
              </div>
            </details>
            <AnalysisEngineChoice />
            <button disabled={busy}>
              {busy ? "Yükleniyor…" : "Yükle ve analiz et"}
            </button>
            <p>
              Varsayılan mod Mac üzerinde çalışır. Claude yalnız açık seçimin ve
              onayınla kullanılır; yerel hata halinde otomatik geçiş yapılmaz.
            </p>
            <p role="status">{message}</p>
          </form>
        </section>
      </div>
      <div
        role="tabpanel"
        id="analysis-panel-history"
        aria-labelledby="analysis-tab-history"
        hidden={workspace !== "history"}
      >
        <div className="section-heading">
          <h2>Görsellerim ve raporlarım</h2>
          <span className="status-pill">{records.length} kayıt bu sayfada</span>
        </div>
        <p role="status">{message}</p>
        {records.length ? (
          records.map((a) => (
            <AnalysisHistory
              key={a.id}
              a={a}
              visible={workspace === "history"}
              autoOpen={a.id === createdId}
            />
          ))
        ) : (
          <p>İlk görselini yükleyerek başla.</p>
        )}
      </div>
    </>
  );
}
