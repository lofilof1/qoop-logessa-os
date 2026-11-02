"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {AlertCircle,ArrowUpRight,CheckCircle2,Compass,FileText,ImagePlus,Info,Layers,Leaf,Menu,Plus,Search,Settings,ShieldCheck,SlidersHorizontal,Sparkles,X} from "lucide-react";
import {Editor} from "@/components/studio/design-editor";
import {Library} from "@/components/studio/library";
import {KeywordLab} from "@/components/studio/keyword-lab";
import {ProductFlow} from "@/components/studio/product-flow";
import {MockupStudio} from "@/components/studio/mockup-studio";
import {SettingsView} from "@/components/studio/settings-view";
import {SeasonalView} from "@/components/studio/seasonal-view";
import {Tools} from "@/components/studio/tools";
import {StudioGuide} from "@/components/studio/studio-guide";
import {api,download,type Research} from "@/lib/client";
import {type Design} from "@/lib/domain";

type View="home"|"research"|"seasonal"|"designs"|"listings"|"tools"|"settings"|"mockup";
type Session={user:{name:string}|null;aluraConfigured:boolean;aiConfigured:boolean;demo?:boolean};
const navigation=[{id:"home",name:"Ürün oluştur",icon:Sparkles},{id:"mockup",name:"Mockup atölyesi",icon:ImagePlus},{id:"research",name:"Pazar analizi",icon:Compass},{id:"seasonal",name:"Trend & sezon",icon:Leaf},{id:"designs",name:"Koleksiyonlarım",icon:Layers},{id:"listings",name:"İlan paketleri",icon:FileText}] as const;

export default function Studio(){
 const[view,setView]=useState<View>("home"),[session,setSession]=useState<Session|null>(null),[designs,setDesigns]=useState<Design[]>([]),[history,setHistory]=useState<Research[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[productionIdea,setProductionIdea]=useState(""),[editor,setEditor]=useState<Design|null>(null),[editorTab,setEditorTab]=useState("brief"),[mobile,setMobile]=useState(false),[toast,setToast]=useState("");
 const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const[productionKey,setProductionKey]=useState(0),[mockupId,setMockupId]=useState('');
 const leaveGuards=useRef<Record<string,(()=>Promise<boolean>)|null>>({}),viewRef=useRef<View>('home');
 const flowGuard=useCallback((g:(()=>Promise<boolean>)|null)=>{leaveGuards.current.home=g;},[]),mockupGuard=useCallback((g:(()=>Promise<boolean>)|null)=>{leaveGuards.current.mockup=g;},[]);
 const[guideOpen,setGuideOpen]=useState(false),guideChecked=useRef(false);
 useEffect(()=>{if(loading||!session?.user||editor||guideChecked.current)return;guideChecked.current=true;try{if(localStorage.getItem('logessa-studio-guide-v1')!=='seen')setGuideOpen(true);}catch{setGuideOpen(true);}},[loading,session,editor]);
 const closeGuide=()=>{setGuideOpen(false);try{localStorage.setItem('logessa-studio-guide-v1','seen');}catch{}};
 const notify=useCallback((s:string)=>{setToast(s);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),5500);},[]);
 const reload=useCallback(async()=>{setLoading(true);setError("");try{const s=await api<Session>("/api/session");setSession(s);if(s.user){const results=await Promise.allSettled([api<Design[]>("/api/designs"),api<Research[]>("/api/research")]);if(results[0].status==="fulfilled")setDesigns(results[0].value);if(results[1].status==="fulfilled")setHistory(results[1].value);const failed=results.find(r=>r.status==="rejected");if(failed?.status==="rejected")setError(failed.reason.message);}}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{reload();const change=async()=>{const v=location.hash.slice(1) as View;if(!["home","mockup","research","seasonal","designs","listings","tools","settings"].includes(v)||v===viewRef.current)return;const g=leaveGuards.current[viewRef.current];if(g&&!await g()){window.history.replaceState(null,'',`#${viewRef.current}`);return;}viewRef.current=v;setView(v);};change();window.addEventListener("hashchange",change);return()=>window.removeEventListener("hashchange",change);},[reload]);
 const go=async(v:View,skipGuard=false)=>{const guard=leaveGuards.current[viewRef.current];if(!skipGuard&&guard&&!await guard())return false;viewRef.current=v;setView(v);location.hash=v;setMobile(false);window.scrollTo({top:0});return true;};
 const updated=useCallback((d:Design)=>setDesigns(old=>[d,...old.filter(x=>x.id!==d.id)]),[]);
 const open=useCallback((d:Design,tab="brief")=>{setEditor(structuredClone(d));setEditorTab(tab);},[]);
 const launch=async(idea="")=>{const g=leaveGuards.current[viewRef.current];if(g&&!await g())return;sessionStorage.removeItem('logessa-product-flow');setProductionIdea(idea);setProductionKey(k=>k+1);go('home',true);};
 const exportAll=()=>download(`logessa-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({format:"logessa-studio",version:2,exportedAt:new Date().toISOString(),designs,research:history},null,2));
 const active=designs.filter(d=>!d.archived),title=navigation.find(n=>n.id===view)?.name||(view==="tools"?"Hesaplayıcılar":"Bağlantılar & ayarlar");
 return <div className="app-shell production-shell">
 {mobile&&<button className="sidebar-scrim" aria-label="Menüyü kapat" onClick={()=>setMobile(false)}/>}
 <aside className={`sidebar ${mobile?"mobile-open":""}`}><a href="#home" className="brand" onClick={e=>{e.preventDefault();go("home");}}><span className="brand-symbol"><Leaf size={24} strokeWidth={1.4}/></span><span>LOGESSA<small>DESIGN STUDIO</small></span></a><button className="sidebar-create" onClick={()=>launch()}><Plus size={17}/>Yeni ürün<Sparkles size={14}/></button><div className="nav-label">STÜDYON</div><nav aria-label="Ana menü">{navigation.map(n=><button key={n.id} className={view===n.id?"active":""} aria-current={view===n.id?"page":undefined} onClick={()=>go(n.id)}><n.icon size={19} strokeWidth={1.6}/>{n.name}{n.id==="designs"&&active.length>0&&<span className="nav-count">{active.length}</span>}</button>)}</nav><div className="nav-label spaced">ÇALIŞMA ALANI</div><nav><button className={view==="tools"?"active":""} onClick={()=>go("tools")}><SlidersHorizontal size={18}/>Hesaplayıcılar</button><button className={view==="settings"?"active":""} onClick={()=>go("settings")}><Settings size={18}/>Bağlantılar & ayarlar{!session?.aiConfigured&&<i className="setup-dot"/>}</button></nav><div className="sidebar-bottom"><div className="studio-connections"><div><i className={session?.aluraConfigured?"connected":""}/>Alura<span>{session?.demo?"Demo örnekleri":session?.aluraConfigured?"Bağlı":"Kurulum bekliyor"}</span></div><div><i className={session?.aiConfigured?"connected":""}/>Yapay zekâ<span>{session?.aiConfigured?"Bağlı":"Kurulum bekliyor"}</span></div></div><div className="profile"><span className="profile-avatar">LS</span><div>Logessa Studio<small>{session?.demo?"Tarayıcına özel demo":session?.user?"Özel çalışma alanın":"Oturum açarak başla"}</small></div><ShieldCheck size={15}/></div></div></aside>
 <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Menüyü aç" onClick={()=>setMobile(true)}><Menu size={20}/></button><span>Stüdyo</span><span className="crumb-divider">/</span><strong>{title}</strong></div><div className="topbar-right"><label className="global-search"><Search size={16}/><input aria-label="Tasarımlarda ara" placeholder="Koleksiyonunda ara…" value={search} onChange={e=>{setSearch(e.target.value);if(view!=="designs")go("designs");}}/></label><button className="guide-trigger" aria-label="Stüdyo rehberini aç" title="Stüdyo rehberi" onClick={()=>{setMobile(false);setGuideOpen(true);}}><Info size={17}/><span>Rehber</span></button></div></header><main id="main-content">
 {error&&<div className="alert error"><AlertCircle size={18}/><span>{error}</span><button onClick={reload}>Yenile</button></div>}
 {!loading&&!session?.user&&<div className="signin-banner"><div><ShieldCheck size={20}/><span>Çalışmalarını kaydetmek ve üretmek için çalışma alanına giriş yap.</span></div><a className="button primary" href="/signin-with-chatgpt?return_to=/" target="_top">Giriş yap <ArrowUpRight size={16}/></a></div>}
 {view==="home"&&session?.user&&<ProductFlow key={productionKey} demo={session.demo} registerGuard={flowGuard} initialIdea={productionIdea} aiConfigured={!!session?.aiConfigured} onGenerated={updated} onMockup={d=>{setMockupId(d.id);go('mockup',true);}} onLibrary={()=>go('designs',true)} notify={notify}/>}
 {view==="mockup"&&<MockupStudio registerGuard={mockupGuard} designs={designs} initialId={mockupId} onSaved={updated} notify={notify}/>}
 {view==="research"&&<KeywordLab demo={session?.demo} history={history} onGenerate={launch} onRefresh={reload}/>}
 {view==="seasonal"&&<SeasonalView demo={session?.demo} history={history} onResearch={q=>{sessionStorage.setItem("logessa-research-query",q);go("research");}} onBrief={launch}/>}
 {(view==="designs"||view==="listings")&&<Library designs={designs} search={search} setSearch={setSearch} listings={view==="listings"} onOpen={d=>open(d,view==="listings"?"listing":"brief")} onNew={()=>launch()} loading={loading} onExport={exportAll}/>}
 {view==="tools"&&<Tools/>}
 {view==="settings"&&<SettingsView session={session} designs={designs} onExport={exportAll} notify={notify} onReload={reload}/>}
 </main></div>
 {editor&&<Editor initial={editor} initialTab={editorTab} onClose={()=>setEditor(null)} onSaved={d=>{updated(d);notify("Değişiklikler kaydedildi.");}} notify={notify}/>}
 {guideOpen&&<StudioGuide onClose={closeGuide}/>}
 {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/><span>{toast}</span><button aria-label="Bildirimi kapat" onClick={()=>setToast("")}><X size={16}/></button></div>}
 </div>;
}
