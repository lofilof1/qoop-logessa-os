import {finite,keywordMetric,opportunityScore,type KeywordMetric} from './market-analysis.ts';
export type SeasonalObservation=KeywordMetric&{fetchedAt:string;stale:boolean;ageDays:number|null};
type Snapshot={kind:string;data:any;fetchedAt:string};
// Keep the newest dated observation. Duplicate keywords never inflate demand.
export function seasonalObservations(history:Snapshot[],now=Date.now()):SeasonalObservation[]{
 const map=new Map<string,SeasonalObservation>();
 for(const h of history){if(!['keywords','discovery','seasonal'].includes(h.kind)||!Array.isArray(h.data))continue;
  for(const raw of h.data){if(!raw||typeof raw!=='object')continue;const row:KeywordMetric='searches' in raw?{id:String(raw.id||''),keyword:String(raw.keyword||''),searches:finite(raw.searches),competition:finite(raw.competition),competitionLevel:raw.competitionLevel||null,change3m:finite(raw.change3m),avgPrice:finite(raw.avgPrice),asOf:typeof raw.asOf==='string'?raw.asOf:null,source:'Alura',score:null}:keywordMetric(raw);
   if(!row.keyword)continue;row.score=opportunityScore(row.searches,row.competition,row.change3m);
   const age=row.asOf&&Number.isFinite(Date.parse(row.asOf))?Math.max(0,Math.floor((now-Date.parse(row.asOf))/86400000)):null;
   const observation={...row,fetchedAt:h.fetchedAt,ageDays:age,stale:age===null||age>90},key=row.keyword.trim().toLowerCase(),previous=map.get(key);
   const stamp=(x:{asOf:string|null;fetchedAt:string})=>Date.parse(x.asOf||'')||Date.parse(x.fetchedAt)||0;
   if(!previous||stamp(observation)>stamp(previous)||(stamp(observation)===stamp(previous)&&Date.parse(h.fetchedAt)>Date.parse(previous.fetchedAt)))map.set(key,observation);
  }
 }
 return [...map.values()].sort((a,b)=>(b.score??-1)-(a.score??-1));
}
export function seasonalStats(rows:SeasonalObservation[]){
 const fresh=rows.filter(r=>!r.stale),measured=fresh.filter(r=>r.change3m!==null);
 return{count:rows.length,fresh:fresh.length,stale:rows.length-fresh.length,rising:measured.filter(r=>r.change3m!>0).length,falling:measured.filter(r=>r.change3m!<0).length};
}
export function nextPeak(peaks:number[],month:number){if(!peaks.length)return null;return [...peaks].sort((a,b)=>((a-month+12)%12)-((b-month+12)%12))[0];}
