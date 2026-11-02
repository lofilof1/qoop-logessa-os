"use client";
import { api, download, json } from "@/lib/client";
import { type Design, type DesignBody, buildPrompt, csvCell, kindLabels, listingIssues, printCheck, readiness, stageLabels, stages } from "@/lib/domain";
import { AlertCircle, Archive, BookOpen, Check, CheckCircle2, Copy, Download, FileText, ImagePlus, Layers, Leaf, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Modal } from "./ui";
import { MockupWorkspace } from "./mockup-workspace";
export function Editor({ initial, initialTab, onClose, onSaved, notify }: {
    initial: Design;
    initialTab: string;
    onClose: () => void;
    onSaved: (d: Design) => void;
    notify: (m: string) => void;
}) {
    const [d, setD] = useState(initial), [tab, setTab] = useState(initialTab), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(JSON.stringify(initial)), [tagText, setTagText] = useState(initial.body.tags.join(", ")), [preview, setPreview] = useState("master");
    const body = (patch: Partial<DesignBody>) => setD(old => ({ ...old, body: { ...old.body, ...patch } }));
    const tags = tagText.split(",").map(t => t.trim()).filter(Boolean), effective = { ...d, body: { ...d.body, tags } };
    const dirty = JSON.stringify(effective) !== saved;
    const close = () => { if (!busy && (!dirty || window.confirm("Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?")))
        onClose(); };
    useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
    } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
    const persist = async (next = effective) => { setBusy(true); setError(""); try {
        const value = await api(`/api/designs/${d.id}`, json(next, "PATCH")), merged = { ...next, ...value };
        setD(merged);
        setSaved(JSON.stringify(merged));
        onSaved(merged);
        return merged;
    }
    catch (e) {
        setError((e as Error).message);
        return null;
    }
    finally {
        setBusy(false);
    } };
    const upload = async (file?: File) => { if (!file)
        return; if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
        setError("En fazla 15 MB PNG, JPG veya WebP seç.");
        return;
    } setBusy(true); setError(""); try {
        const bitmap = await createImageBitmap(file);
        const widthPx = bitmap.width, heightPx = bitmap.height;
        bitmap.close();
        const asset = await api(`/api/assets?designId=${d.id}`, { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file });
        const stored = await persist({ ...effective, stage: d.stage === "ready" ? "review" : d.stage, body: { ...effective.body, imageId: asset.id, widthPx, heightPx } });
        if (stored)
            notify("Master dosyası yüklendi; piksel ölçüleri dosyadan okundu.");
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } };
    const p = printCheck(d.body), issues = listingIssues(effective.body), allIssues = readiness(effective);
    const exportListing = () => { if (issues.length) {
        setError("İlanı dışa aktarmadan önce başlık, etiket ve açıklama kontrollerini tamamla.");
        return;
    } download(`${d.name.replace(/[^a-zA-Z0-9-]/g, "-")}-listing.csv`, "\uFEFF" + ["title", "tags", "description", "status"].map(csvCell).join(",") + "\r\n" + [d.body.title, tags.join(", "), d.body.description, "DRAFT"].map(csvCell).join(","), "text/csv;charset=utf-8"); notify("İngilizce ilan taslağı CSV olarak indirildi."); };
    return <Modal wide title={d.name} subtitle={`${kindLabels[d.kind]} · ${d.body.collection || "Bağımsız tasarım"} · Sürüm ${d.version}`} onClose={close}>
  <div className="editor-tabs" role="tablist" aria-label="Tasarım adımları">{[{ id: "brief", name: "Brief", icon: BookOpen }, { id: "design", name: "Tasarım", icon: Layers }, { id: "mockup", name: "Mockup", icon: ImagePlus }, { id: "review", name: "Baskı kontrolü", icon: ShieldCheck }, { id: "listing", name: "İlan", icon: FileText }].map((t, i) => <button role="tab" aria-selected={tab === t.id} className={tab === t.id ? "selected" : ""} key={t.id} onClick={() => setTab(t.id)}><span>{String(i + 1).padStart(2, "0")}</span><t.icon size={16}/>{t.name}</button>)}</div>
  <div className="editor-content">
  {tab === "brief" && <><div className="editor-section-title"><h3>Fikrinin çerçevesini çiz.</h3><p>Ne tasarlıyorsun, kimin için ve hangi hisle?</p></div><div className="form-grid"><Field label="Tasarım adı"><input value={d.name} maxLength={120} onChange={e => setD({ ...d, name: e.target.value })}/></Field><Field label="Koleksiyon"><input value={d.body.collection} maxLength={100} onChange={e => body({ collection: e.target.value })}/></Field><Field label="Ana motif" hint="Prompt için İngilizce gir. Örn. delicate olive branches"><input value={d.body.motif} maxLength={200} onChange={e => body({ motif: e.target.value })} placeholder="delicate olive branches"/></Field><Field label="Stil"><input value={d.body.style} maxLength={200} onChange={e => body({ style: e.target.value })} placeholder="vintage botanical, hand-painted aesthetic"/></Field><Field label="Renk paleti"><input value={d.body.palette} maxLength={200} onChange={e => body({ palette: e.target.value })} placeholder="warm ivory, sage green, terracotta"/></Field><Field label="Hedef mekân"><input value={d.body.room} maxLength={120} onChange={e => body({ room: e.target.value })} placeholder="living room"/></Field></div><Field label="Araştırma anahtar kelimesi"><input value={d.body.keyword} maxLength={150} onChange={e => body({ keyword: e.target.value })} placeholder="botanical wallpaper"/></Field><Field label="Yaratıcı notlar"><textarea rows={4} maxLength={8000} value={d.body.notes} onChange={e => body({ notes: e.target.value })} placeholder="Kompozisyon, motif ölçeği, kaçınılacak unsurlar ve referans notların…"/></Field><div className="info-banner"><Leaf size={19}/><span>Referanslar ilham içindir. Kendi özgün motifini ve kompozisyonunu geliştir.</span></div></>}
  {tab === "design" && <><div className="editor-section-title"><h3>Fikirden görsele.</h3><p>Briefinden bir prompt oluştur; kendi ürettiğin master dosyasını yükle.</p></div><div className="editor-two-col"><div><Field label="Üretim promptu" hint="Brief alanlarından hazırlanan düzenlenebilir şablondur; model çağrısı yapmaz."><textarea rows={13} maxLength={10000} value={d.body.prompt} onChange={e => body({ prompt: e.target.value })} placeholder="Önce briefini doldur, ardından prompt şablonunu oluştur."/></Field><div className="button-row"><Button secondary onClick={() => { if (!d.body.prompt || window.confirm("Mevcut prompt briefinden yeniden oluşturulsun mu?"))
        body({ prompt: buildPrompt(d.body, d.kind) }); }}>Brieften hazırla</Button><button className="text-button" onClick={async () => { try {
        await navigator.clipboard.writeText(d.body.prompt);
        notify("Prompt kopyalandı.");
    }
    catch {
        setError("Kopyalanamadı; metni seçip elle kopyalayabilirsin.");
    } }}><Copy size={15}/>Kopyala</button></div></div><div><label className="upload-area"><ImagePlus size={28}/><strong>{d.body.imageId ? "Master dosyasını değiştir" : "Master görselini yükle"}</strong><span>PNG, JPG, WebP · En fazla 15 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => upload(e.target.files?.[0])}/></label>{d.body.imageId && <><div className="segmented preview-switch">{[["master", "Master"], ["repeat", "3×3 tekrar"], ["room", "Mekân"]].map(([k, l]) => <button key={k} className={preview === k ? "selected" : ""} onClick={() => {if(k === "room") setTab("mockup"); else setPreview(k);}}>{l}</button>)}</div>{preview === "room" ? <MockupWorkspace imageId={d.body.imageId} kind={d.kind} settings={d.body.mockup} onChange={mockup => body({mockup})} notify={notify}/> : <div className={`master-preview ${preview === "repeat" ? "repeat-grid" : ""}`}>{Array.from({ length: preview === "repeat" ? 9 : 1 }, (_, i) => <img key={i} src={`/api/assets/${d.body.imageId}`} alt={i === 0 ? "Yüklenen master görseli" : ""}/>)}</div>}<a className="text-button documentation" href={`/api/assets/${d.body.imageId}?download=1`}>Master dosyasını indir <Download size={14}/></a><small className="caption">{d.body.widthPx} × {d.body.heightPx} px · {preview === "repeat" ? "Kenar eşleşmesini gözle incele." : "Önizleme baskı kalitesini onaylamaz."}</small></>}</div></div></>}
  {tab === "mockup" && <MockupWorkspace imageId={d.body.imageId} kind={d.kind} settings={d.body.mockup} onChange={mockup => body({mockup})} notify={notify}/>}
  {tab === "review" && <><div className="editor-section-title"><h3>Üretmeden önce emin ol.</h3><p>Hesaplanan teknik değerleri ve fiziksel kontrolleri birlikte değerlendir.</p></div><div className="form-grid four"><Field label="Dosya genişliği · px"><input type="number" min={0} max={100000} readOnly={!!d.body.imageId} value={d.body.widthPx || ""} onChange={e => body({ widthPx: Number(e.target.value) })}/></Field><Field label="Dosya yüksekliği · px"><input type="number" min={0} max={100000} readOnly={!!d.body.imageId} value={d.body.heightPx || ""} onChange={e => body({ heightPx: Number(e.target.value) })}/></Field><Field label="Baskı genişliği · cm"><input type="number" min={0} max={10000} step="0.1" value={d.body.widthCm || ""} onChange={e => body({ widthCm: Number(e.target.value) })}/></Field><Field label="Baskı yüksekliği · cm"><input type="number" min={0} max={10000} step="0.1" value={d.body.heightCm || ""} onChange={e => body({ heightCm: Number(e.target.value) })}/></Field></div><Field label="Üreticinin istediği minimum DPI" hint="Üreticinin gerçek şartını gir; varsayılan değer bir baskı onayı değildir."><input type="number" min={30} max={1200} value={d.body.targetDpi} onChange={e => body({ targetDpi: Number(e.target.value) })}/></Field><div className="qc-summary"><div className={p.resolution ? "pass" : "warn"}><strong>{p.dpi === null ? "—" : p.dpi.toFixed(1)} <small>DPI</small></strong><span>{p.dpi === null ? "Ölçüleri tamamla" : p.resolution ? "Çözünürlük hedefi karşılanıyor" : "Çözünürlük hedefin altında"}</span></div><div className={p.aspect ? "pass" : "warn"}><strong>{p.ratio === null ? "—" : p.aspect ? "Uyumlu" : "Farklı"}</strong><span>Dosya ve baskı en-boy oranı · %1 tolerans</span></div></div><div className="checklist">{Object.entries({ rights: "Görselin kullanım ve satış haklarını kontrol ettim.", seams: d.kind === "pattern" ? "3×3 tekrarda tüm kenarları ve köşeleri gözle kontrol ettim." : "Kompozisyonu ve varsa panel birleşimlerini kontrol ettim.", proof: "Gerçek boyutta fiziksel baskı provasını inceledim.", manufacturer: "Renk profili, malzeme ve üretici şartlarını doğruladım." }).map(([key, label]) => <label key={key}><input type="checkbox" checked={d.body.checks[key as keyof DesignBody["checks"]]} onChange={e => body({ checks: { ...d.body.checks, [key]: e.target.checked } })}/><span>{label}</span></label>)}</div><div className="info-banner"><ShieldCheck size={20}/><span>DPI hesabı tek başına baskı onayı değildir. Renk, tekrar sürekliliği ve malzeme uygunluğu ayrıca kontrol edilir.</span></div></>}
  {tab === "listing" && <><div className="editor-section-title"><div><h3>İlanına son şeklini ver.</h3><p>Müşteri metinleri İngilizce. İç çalışma notları briefte kalır.</p></div><span className={`score-pill ${issues.length ? "warn" : "pass"}`}>{issues.length ? `${issues.length} eksik kontrol` : "Biçim kontrolleri tamam"}</span></div><Field label={`Etsy title · ${d.body.title.length}/140`}><input value={d.body.title} maxLength={300} onChange={e => body({ title: e.target.value })} placeholder="Botanical Wallpaper with Delicate Olive Branches in Warm Sage"/></Field><Field label={`Tags · ${tags.length}/13`} hint="Virgülle ayır. Her etiket en fazla 20 karakter; tekrar edenleri kaldır."><textarea rows={3} value={tagText} onChange={e => setTagText(e.target.value)} placeholder="botanical wallpaper, olive wallpaper, sage wall decor…"/></Field>{tags.length > 0 && <div className="tag-list">{tags.map((t, i) => <span className={t.length > 20 ? "invalid" : ""} key={i}>{t}<small>{t.length}</small></span>)}</div>}<Field label="Description · English"><textarea rows={10} maxLength={20000} value={d.body.description} onChange={e => body({ description: e.target.value })} placeholder="Describe the actual design, verified materials, dimensions, installation and sample information in English."/></Field><div className="listing-bottom"><div>{issues.length ? <ul className="issue-list">{issues.map(i => <li key={i}><AlertCircle size={14}/>{i}</li>)}</ul> : <div className="success-message"><CheckCircle2 size={18}/>Başlık, etiket ve açıklama biçim kontrolleri geçti. Dil ve ürün doğruluğunu son kez gözden geçir.</div>}</div><Button secondary onClick={exportListing} disabled={issues.length > 0}><Download size={16}/>İlan CSV indir</Button></div></>}
  {error && <div className="alert error" role="alert"><AlertCircle size={18}/>{error}</div>}
  </div><div className="editor-footer"><div className="editor-status"><select aria-label="Tasarım durumu" value={d.stage} onChange={e => setD({ ...d, stage: e.target.value })}>{stages.map(s => <option key={s} value={s} disabled={s === "ready" && allIssues.length > 0}>{stageLabels[s]}</option>)}</select><span>{dirty ? "Kaydedilmemiş değişiklikler" : "Tüm değişiklikler kaydedildi"}</span></div><div className="button-row"><button disabled={busy} className="icon-button" aria-label={d.archived ? "Arşivden geri al" : "Arşivle"} onClick={() => persist({ ...effective, archived: !d.archived })}>{d.archived ? <RotateCcw size={18}/> : <Archive size={18}/>}</button><Button secondary disabled={busy} onClick={() => download(`logessa-${d.id}.json`, JSON.stringify(effective, null, 2))}><Download size={16}/>JSON</Button><Button disabled={busy || !dirty} onClick={() => persist()}>{busy ? <Loader2 className="spin" size={16}/> : <Check size={16}/>}Kaydet</Button></div></div>
 </Modal>;
}
