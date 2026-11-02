export type KeywordMetric={id:string;keyword:string;searches:number|null;competition:number|null;competitionLevel:string|null;change3m:number|null;avgPrice:number|null;asOf:string|null;source:"Alura";score:number|null;};
export type Competitor={id:string;title:string;shop:string|null;price:number|null;monthlySales:number|null;asOf:string|null};
export const finite=(n:unknown):number|null=>typeof n==="number"&&Number.isFinite(n)?n:null;
export function keywordMetric(raw:any):KeywordMetric{
 const searches=finite(raw.volume?.etsy_monthly),competition=finite(raw.competition?.competing_listings),change3m=finite(raw.trend?.change_3m);
 return{id:String(raw.id||""),keyword:String(raw.keyword||""),searches,competition,competitionLevel:raw.competition?.level||null,change3m,avgPrice:finite(raw.market?.avg_price_usd),asOf:typeof raw.as_of==="string"?raw.as_of:null,source:"Alura",score:opportunityScore(searches,competition,change3m)};
}
export function mergeKeyword(previous:KeywordMetric|undefined,next:KeywordMetric){
 if(!previous)return next;
 const row={...previous,...next,searches:next.searches??previous.searches,competition:next.competition??previous.competition,competitionLevel:next.competitionLevel??previous.competitionLevel,change3m:next.change3m??previous.change3m,avgPrice:next.avgPrice??previous.avgPrice,asOf:next.asOf??previous.asOf};
 row.score=opportunityScore(row.searches,row.competition,row.change3m);return row;
}
export function opportunityScore(searches:number|null,competition:number|null,trend:number|null):number|null{
 if(searches===null)return null;if(searches<=0)return 0;
 const terms:[number,number][]=[[.60,Math.min(1,Math.log10(1+searches)/5)]];
 if(competition!==null)terms.push([.25,1-Math.min(1,Math.log10(1+Math.max(0,competition))/6)]);
 if(trend!==null)terms.push([.15,Math.max(0,Math.min(1,(trend+.5)/1.5))]);
 const weighted=terms.reduce((s,[w,v])=>s+w*v,0)/terms.reduce((s,[w])=>s+w,0);
 return Math.round(weighted*100);
}
export function competitorMetric(raw:any):Competitor{const price=raw.price?.usd;return{id:String(raw.id||""),title:String(raw.title||""),shop:raw.shop?.name||null,price:price!==null&&price!==undefined&&price!==""&&Number.isFinite(Number(price))?Number(price):null,monthlySales:finite(raw.sales?.est_monthly_avg),asOf:typeof raw.as_of==="string"?raw.as_of:null};}
export function distribution(values:(number|null)[]){const sorted=values.filter((v):v is number=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);const q=(p:number)=>{if(!sorted.length)return null;const n=(sorted.length-1)*p,l=Math.floor(n),f=n-l;return sorted[l]*(1-f)+sorted[Math.min(l+1,sorted.length-1)]*f;};return{count:sorted.length,min:sorted[0]??null,q1:q(.25),median:q(.5),q3:q(.75),max:sorted.at(-1)??null};}
export function marketSummary(keywords:KeywordMetric[],products:Competitor[]){return{keywordCount:keywords.length,knownDemandCount:keywords.filter(k=>k.searches!==null).length,growingCount:keywords.filter(k=>k.change3m!==null&&k.change3m>0).length,topKeyword:[...keywords].filter(k=>k.score!==null).sort((a,b)=>b.score!-a.score!)[0]||null,prices:distribution(products.filter(p=>p.price===null||p.price>=10).map(p=>p.price)),sales:distribution(products.map(p=>p.monthlySales)),productCount:products.length,excludedLowPrice:products.filter(p=>p.price!==null&&p.price<10).length};}
