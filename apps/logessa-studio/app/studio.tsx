"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {AlertCircle,ArrowUpRight,CheckCircle2,Compass,FileText,Info,Layers,Leaf,Menu,Plus,Search,Settings,ShieldCheck,SlidersHorizontal,Sparkles,X} from "lucide-react";
import {Editor} from "@/components/studio/design-editor";
import {DesignCard,Library} from "@/components/studio/library";
import {KeywordLab} from "@/components/studio/keyword-lab";
import {ProductionStudio,GenerationDialog} from "@/components/studio/production-studio";
import {SettingsView} from "@/components/studio/settings-view";
import {SeasonalView} from "@/components/studio/seasonal-view";
import {Tools} from "@/components/studio/tools";
import {StudioGuide} from "@/components/studio/studio-guide";
import {api,download,type Research} from "@/lib/client";
import {type Design} from "@/lib/domain";

type View="home"|"research"|"seasonal"|"designs"|"listings"|"tools"|"settings";
type Session={user:{name:string}|null;aluraConfigured:boolean;aiConfigured:boolean};
const navigation=[{id:"home",name:"Üretim stüdyosu",icon:Sparkles},{id:"research",name:"Pazar analizi",icon:Compass},{id:"seasonal",name:"Trend & sezon",icon:Leaf},{id:"designs",name:"Koleksiyonlarım",icon:Layers},{id:"listings",name:"İlan paketleri",icon:FileText}] as const;

export default function Studio(){
 const[view,setView]=useState<View>("home"),[session,setSession]=useState<Session|null>(null),[designs,setDesigns]=useState<Design[]>([]),[history,setHistory]=useState<Research[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[newOpen,setNewOpen]=useState(false),[productionIdea,setProductionIdea]=useState(""),[editor,setEditor]=useState<Design|null>(null),[editorTab,setEditorTab]=useState("brief"),[mobile,setMobile]=useState(false),[toast,setToast]=useState("");
 const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const[guideOpen,setGuideOpen]=useState(false),guideChecked=useRef(false);
 useEffect(()=>{if(loading||!session?.user||newOpen||editor||guideChecked.current)return;guideChecked.current=true;try{if(localStorage.getItem('logessa-studio-guide-v1')!=='seen')setGuideOpen(true);}catch{setGuideOpen(true);}},[loading,session,newOpen,editor]);
 const closeGuide=()=>{setGuideOpen(false);try{localStorage.setItem('logessa-studio-guide-v1','seen');}catch{}};
 const notify=useCallback((s:string)=>{setToast(s);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),5500);},[]);
 const reload=useCallback(async()=>{setLoading(true);setError("");try{const s=await api<Session>("/api/session");setSession(s);if(s.user){const results=await Promise.allSettled([api<Design[]>("/api/designs"),api<Research[]>("/api/research")]);if(results[0].status==="fulfilled")setDesigns(results[0].value);if(results[1].status==="fulfilled")setHistory(results[1].value);const failed=results.find(r=>r.status==="rejected");if(failed?.status==="rejected")setError(failed.reason.message);}}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{reload();const change=()=>{const v=location.hash.slice(1);if(["home","research","seasonal","designs","listings","tools","settings"].includes(v))setView(v as View);};change();window.addEventListener("hashchange",change);return()=>window.removeEventListener("hashchange",change);},[reload]);
 const go=(v:View)=>{setView(v);location.hash=v;setMobile(false);window.scrollTo({top:0});};
 const updated=useCallback((d:Design)=>setDesigns(old=>[d,...old.filter(x=>x.id!==d.id)]),[]);
 const open=useCallback((d:Design,tab="brief")=>{setEditor(structuredClone(d));setEditorTab(tab);setNewOpen(false);},[]);
 const launch=(idea="")=>{setProductionIdea(idea);setNewOpen(true);setMobile(false);};
 const exportAll=()=>download(`logessa-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({format:"logessa-studio",version:2,exportedAt:new Date().toISOString(),designs,research:history},null,2));
 const active=designs.filter(d=>!d.archived),title=navigation.find(n=>n.id===view)?.name||(view==="tools"?"Hesaplayıcılar":"Bağlantılar & ayarlar");
 return <div className="app-shell production-shell">
 {mobile&&<button className="sidebar-scrim" aria-label="Menüyü kapat" onClick={()=>setMobile(false)}/>}
 <aside className={`sidebar ${mobile?"mobile-open":""}`}><a href="#home" className="brand" onClick={()=>go("home")}><span className="brand-symbol"><Leaf size={24} strokeWidth={1.4}/></span><span>LOGESSA<small>DESIGN STUDIO</small></span></a><button className="sidebar-create" onClick={()=>launch()}><Plus size={17}/>Yeni bir fikir üret<Sparkles size={14}/></button><div className="nav-label">STÜDYON</div><nav aria-label="Ana menü">{navigation.map(n=><button key={n.id} className={view===n.id?"active":""} aria-current={view===n.id?"page":undefined} onClick={()=>go(n.id)}><n.icon size={19} strokeWidth={1.6}/>{n.name}{n.id==="designs"&&active.length>0&&<span className="nav-count">{active.length}</span>}</button>)}</nav><div className="nav-label spaced">ÇALIŞMA ALANI</div><nav><button className={view==="tools"?"active":""} onClick={()=>go("tools")}><SlidersHorizontal size={18}/>Hesaplayıcılar</button><button className={view==="settings"?"active":""} onClick={()=>go("settings")}><Settings size={18}/>Bağlantılar & ayarlar{!session?.aiConfigured&&<i className="setup-dot"/>}</button></nav><div className="sidebar-bottom"><div className="studio-connections"><div><i className={session?.aluraConfigured?"connected":""}/>Alura<span>{session?.aluraConfigured?"Bağlı":"Kurulum bekliyor"}</span></div><div><i className={session?.aiConfigured?"connected":""}/>Yapay zekâ<span>{session?.aiConfigured?"Bağlı":"Kurulum bekliyor"}</span></div></div><div className="profile"><span className="profile-avatar">LS</span><div>Logessa Studio<small>{session?.user?"Özel çalışma alanın":"Oturum açarak başla"}</small></div><ShieldCheck size={15}/></div></div></aside>
 <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Menüyü aç" onClick={()=>setMobile(true)}><Menu size={20}/></button><span>Stüdyo</span><span className="crumb-divider">/</span><strong>{title}</strong></div><div className="topbar-right"><label className="global-search"><Search size={16}/><input aria-label="Tasarımlarda ara" placeholder="Koleksiyonunda ara…" value={search} onChange={e=>{setSearch(e.target.value);if(view!=="designs")go("designs");}}/></label><button className="guide-trigger" aria-label="Stüdyo rehberini aç" title="Stüdyo rehberi" onClick={()=>{setMobile(false);setGuideOpen(true);}}><Info size={17}/><span>Rehber</span></button></div></header><main id="main-content">
 {error&&<div className="alert error"><AlertCircle size={18}/><span>{error}</span><button onClick={reload}>Yenile</button></div>}
 {!loading&&!session?.user&&<div className="signin-banner"><div><ShieldCheck size={20}/><span>Çalışmalarını kaydetmek ve üretmek için çalışma alanına giriş yap.</span></div><a className="button primary" href="/signin-with-chatgpt?return_to=/" target="_top">Giriş yap <ArrowUpRight size={16}/></a></div>}
 {view==="home"&&<><ProductionStudio aiConfigured={!!session?.aiConfigured} onGenerated={updated} onOpen={open} onSettings={()=>go("settings")}/>{active.length>0&&<section className="home-collection"><div className="section-heading"><div><h2>Koleksiyonun büyüyor.</h2><p>Son ürettiğin tasarımlara geri dön.</p></div><button className="text-button" onClick={()=>go("designs")}>Tümünü aç <ArrowUpRight size={15}/></button></div><div className="recent-grid">{active.slice(0,3).map((d,i)=><DesignCard key={d.id} d={d} i={i} onClick={()=>open(d)}/>)}</div></section>}</>}
 {view==="research"&&<KeywordLab history={history} onGenerate={launch} onRefresh={reload}/>}
 {view==="seasonal"&&<SeasonalView history={history} onResearch={q=>{sessionStorage.setItem("logessa-research-query",q);go("research");}} onBrief={launch}/>}
 {(view==="designs"||view==="listings")&&<Library designs={designs} search={search} setSearch={setSearch} listings={view==="listings"} onOpen={d=>open(d,view==="listings"?"listing":"brief")} onNew={()=>launch()} loading={loading} onExport={exportAll}/>}
 {view==="tools"&&<Tools/>}
 {view==="settings"&&<SettingsView session={session} designs={designs} onExport={exportAll} notify={notify} onReload={reload}/>}
 </main></div>
 {newOpen&&<GenerationDialog key={productionIdea} initialIdea={productionIdea} aiConfigured={!!session?.aiConfigured} onClose={()=>setNewOpen(false)} onGenerated={updated} onOpen={open} onSettings={()=>{setNewOpen(false);go("settings");}}/>}
 {editor&&<Editor initial={editor} initialTab={editorTab} onClose={()=>setEditor(null)} onSaved={d=>{updated(d);notify("Değişiklikler kaydedildi.");}} notify={notify}/>}
 {guideOpen&&<StudioGuide onClose={closeGuide}/>}
 {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/><span>{toast}</span><button aria-label="Bildirimi kapat" onClick={()=>setToast("")}><X size={16}/></button></div>}
 </div>;
}
