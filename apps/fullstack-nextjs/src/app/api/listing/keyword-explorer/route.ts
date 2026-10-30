import { db } from '@/lib/db';
import { exactLegacy, keywordClass, keywordRatio, keywordRelevant } from '@/lib/keyword-explorer';
import type { Metrics } from '@/lib/csv-research';
export const dynamic='force-dynamic';
export async function GET(req:Request) {
 const u=new URL(req.url);
 const [legacy,observations]=await Promise.all([
 db.researchKeyword.findMany({select:{term:true,category:true,data:true}}),
 db.keywordCsvObservation.findMany({where:{platform:'Etsy',source:'erank-keyword'},orderBy:[{createdAt:'asc'},{id:'asc'}],include:{batch:{select:{file:{select:{name:true}}}}}})]);
 const cohorts=new Map<string,string>();
 const key=(o:{market:string,definition:string,period:string,observedAt:string})=>JSON.stringify([o.market,o.definition,o.period,o.observedAt]);
 for(const o of observations) cohorts.set(key(o),`${o.market} · ${o.definition} · ${o.period||'dönem bilinmiyor'} · ${o.observedAt||'tarih bilinmiyor'}`);
 const selected=u.searchParams.get('cohort')||'legacy';
 const old=new Map(legacy.map(k=>[k.term,k]));
 type Row={term:string;category:string;searches:number|null;competition:number|null;ctr:number|null;searchesRaw:string;competitionRaw:string;ctrRaw:string;ratio:number|null;families:string[];source:string;date:string;comparable:boolean;relevant:boolean};
 const map=new Map<string,Row>();
 if(selected==='legacy') for(const k of legacy) {
 const d=k.data as Record<string,unknown>;
 map.set(k.term,{term:k.term,category:keywordClass(k.term,k.category),searches:exactLegacy(d.aylik_arama),competition:exactLegacy(d.rakip_ilan),ctr:exactLegacy(d.ctr),searchesRaw:String(d.aylik_arama||'—'),competitionRaw:String(d.rakip_ilan||'—'),ctrRaw:String(d.ctr||'—'),ratio:null,families:String(d.kelime_dosyalari||'').split(';').map(s=>s.trim()).filter(Boolean),source:'16 Ekim 2026 arşiv snapshot',date:'Ölçüm tarihi / ülke / dönem doğrulanmadı',comparable:false,relevant:keywordRelevant(k.term)});
 } else for(const o of observations.filter(o=>key(o)===selected)) {
 const m=o.metrics as unknown as Metrics;
 const searches=m.searches.kind==='exact'?m.searches.value:null, competition=m.competition.kind==='exact'?m.competition.value:null;
 const comparable=o.market!=='unknown'&&['monthly','rolling12'].includes(o.definition)&&!!o.period&&!!o.observedAt;
 const d=old.get(o.term)?.data as Record<string,unknown>|undefined;
 map.set(o.term,{term:o.term,category:keywordClass(o.term),searches,competition,ctr:m.ctr.kind==='exact'?m.ctr.value:null,searchesRaw:m.searches.raw||'—',competitionRaw:m.competition.raw||'—',ctrRaw:m.ctr.raw||'—',ratio:keywordRatio(searches,competition,comparable),families:String(d?.kelime_dosyalari||'').split(';').map(s=>s.trim()).filter(Boolean),source:o.batch.file.name,date:o.observedAt||'Bilinmiyor',comparable,relevant:keywordRelevant(o.term)});
 }
 const q=(u.searchParams.get('q')||'').toLowerCase(), category=u.searchParams.get('category')||'', min=Math.max(0,Number(u.searchParams.get('min'))||0), multi=u.searchParams.get('multi')==='1', relevant=u.searchParams.get('relevant')!=='0';
 const all=[...map.values()];
 const rows=all.filter(r=>(!q||r.term.includes(q))&&(!category||r.category===category)&&(!min||(r.searches!==null&&r.searches>=min))&&(!multi||r.families.length>1)&&(!relevant||r.relevant));
 const sort=u.searchParams.get('sort')||'ratio';
 rows.sort((a,b)=> sort==='term'?a.term.localeCompare(b.term):((sort==='searches'?b.searches:sort==='competition'?b.competition:b.ratio)??-1)-((sort==='searches'?a.searches:sort==='competition'?a.competition:a.ratio)??-1)||a.term.localeCompare(b.term));
 const page=Math.max(1,Math.floor(Number(u.searchParams.get('page'))||1)),pages=Math.max(1,Math.ceil(rows.length/50)),actualPage=Math.min(page,pages);
 const groups=['Stil / dönem','Motif','Renk','Oda / kullanım'].map(category=>({category,items:rows.filter(r=>r.category===category&&r.ratio!==null&&r.searches!==null&&r.searches>=150).sort((a,b)=>b.ratio!-a.ratio!).slice(0,6)}));
 return Response.json({items:rows.slice((actualPage-1)*50,actualPage*50),total:rows.length,datasetTotal:all.length,page:actualPage,pages,groups,cohort:selected,cohorts:[{id:'legacy',label:'Eski arşiv · doğrulanmamış ölçümler'},...[...cohorts].map(([id,label])=>({id,label}))],unranked:rows.filter(r=>r.ratio===null).length},{headers:{'Cache-Control':'no-store'}});
}
