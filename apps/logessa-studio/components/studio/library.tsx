"use client";
import { date } from "@/lib/client";
import { type Design, kindLabels, stageLabels, stages } from "@/lib/domain";
import { Archive, ArrowUpRight, Download, FileText, Grid2X2, List, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Empty, Pattern } from "./ui";
export function DesignCard({ d, i, onClick }: {
    d: Design;
    i: number;
    onClick: () => void;
}) { return <button className="design-card" onClick={onClick}><div className="design-cover">{d.body.imageId ? <img src={`/api/assets/${d.body.imageId}`} alt={d.name}/> : <Pattern variant={i}/>}<span className="kind-tag">{kindLabels[d.kind]}</span></div><div className="design-card-body"><small>{d.body.collection || "BAĞIMSIZ TASARIM"}</small><h3>{d.name}<ArrowUpRight size={16}/></h3><div><Badge stage={d.stage}/><span>{date(d.updatedAt)}</span></div></div></button>; }
export function Library({ designs, search, setSearch, listings, onOpen, onNew, loading, onExport }: {
    designs: Design[];
    search: string;
    setSearch: (v: string) => void;
    listings: boolean;
    onOpen: (d: Design) => void;
    onNew: () => void;
    loading: boolean;
    onExport: () => void;
}) {
    const [filter, setFilter] = useState("all"), [archived, setArchived] = useState(false), [grid, setGrid] = useState(true), [sort, setSort] = useState("recent");
    const items = designs.filter(d => d.archived === archived && (!search || [d.name, d.body.collection, d.body.motif, d.body.keyword].join(" ").toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))) && (filter === "all" || d.stage === filter)).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "tr") : b.updatedAt.localeCompare(a.updatedAt));
    return <><div className="page-heading"><div><div className="eyebrow">{listings ? "SON DOKUNUŞLAR" : "TÜM YARATICI ÇALIŞMALARIN"}</div><h1>{listings ? "İlan çalışma alanı" : "Tasarım kütüphanesi"}<span>.</span></h1><p>{listings ? "Her tasarımın başlığı, etiketleri ve açıklaması tek yerde." : "Birbirinden ayrı dosyalar yerine, bir arada ilerleyen tasarımlar."}</p></div><Button onClick={onNew}><Plus size={17}/>Yeni tasarım</Button></div>
 {listings && <div className="info-banner"><FileText size={20}/><span>Etsy metinleri İngilizce hazırlanır. Dışa aktarılan kayıt bir taslaktır; son dil ve ürün kontrolü sana aittir.</span></div>}
 <div className="library-toolbar"><label className="search-box"><Search size={17}/><input placeholder="İsim, koleksiyon veya anahtar kelime ara…" aria-label="Kütüphanede ara" value={search} onChange={e => setSearch(e.target.value)}/></label><select aria-label="Sıralama" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Son güncellenen</option><option value="name">İsme göre</option></select><button className={`icon-button ${!grid ? "selected" : ""}`} onClick={() => setGrid(!grid)} aria-label={grid ? "Liste görünümü" : "Kart görünümü"}>{grid ? <List size={18}/> : <Grid2X2 size={18}/>}</button><button className="icon-button" onClick={onExport} aria-label="Çalışma alanını dışa aktar"><Download size={18}/></button></div>
 <div className="filter-row"><div className="filter-tabs"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Tümü <span>{designs.filter(d => d.archived === archived).length}</span></button>{stages.map(s => <button key={s} className={filter === s ? "selected" : ""} onClick={() => setFilter(s)}>{stageLabels[s]}</button>)}</div><button className={`text-button ${archived ? "olive" : ""}`} onClick={() => setArchived(!archived)}><Archive size={15}/>{archived ? "Arşivdekiler" : "Arşiv"}</button></div>
 {loading ? <div className="loading"><Loader2 className="spin"/>Çalışmalar yükleniyor…</div> : items.length ? <div className={grid ? "library-grid" : "library-list"}>{items.map((d, i) => <DesignCard key={d.id} d={d} i={i} onClick={() => onOpen(d)}/>)}</div> : <Empty title={search || filter !== "all" ? "Bu filtrede tasarım yok" : archived ? "Arşivin boş" : "Yeni koleksiyonun burada büyüyecek"} action={!archived && <Button onClick={onNew}><Plus size={16}/>Tasarım oluştur</Button>}>{search ? "Farklı bir kelimeyle arayabilir veya filtreleri değiştirebilirsin." : "Bir tasarım kaydı aç; araştırmadan ilana kadar tüm adımlarını aynı yerde tut."}</Empty>}
 </>;
}
