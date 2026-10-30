import {csvTable,csvMetric,type Metric} from './csv-research';
export const topListingVersion='top-listings-v1';
export const topMetricColumns=['Age (Days)','Views','Daily Views','Est. Sales','Price','Est. Revenue','Hearts'] as const;
export type TopListingRow={row:number;position:number;listingId:string;url:string;title:string;shop:string;metrics:Record<string,Metric>;raw:Record<string,string>};
export function parseTopListings(text:string){
 const table=csvTable(text);for(const h of ['Listing','Listing URL','Shop'])if(!table.headers.includes(h))throw Error('Top Listings sütunu eksik: '+h);
 if(table.rows.length>10000)throw Error('En fazla 10.000 ilan satırı.');
 const rows:TopListingRow[]=[];
 for(const [i,cells] of table.rows.entries()){
  if(cells.length!==table.headers.length)throw Error(`Satır ${i+2}: sütun sayısı farklı.`);
  const raw=Object.fromEntries(table.headers.map((h,j)=>[h,cells[j]]));let u:URL;try{u=new URL(raw['Listing URL']);}catch{throw Error(`Satır ${i+2}: geçersiz ilan URL.`);}
  const listingId=/^\/listing\/(\d+)(?:\/|$)/.exec(u.pathname)?.[1];if(!listingId||!['etsy.com','www.etsy.com'].includes(u.hostname)||!['https:','http:'].includes(u.protocol))throw Error(`Satır ${i+2}: Etsy ilan kimliği bulunamadı.`);
  rows.push({row:i+2,position:i+1,listingId,url:raw['Listing URL'],title:raw.Listing,shop:raw.Shop,metrics:Object.fromEntries(topMetricColumns.map(h=>[h,csvMetric(raw[h]||'','en')])),raw});
 }
 return {headers:table.headers,rows};
}
export type TopImport={id:string;name:string;query:string;market:string;observedAt:string;currency:string;rows:TopListingRow[]};
export function topListingReport(imports:TopImport[]){
 // Keep every source observation but count each listing once in the selected archive.
 const all=imports.flatMap(b=>b.rows.map(r=>({...r,query:b.query,batchId:b.id,market:b.market,observedAt:b.observedAt}))),unique=[...new Map(all.map(r=>[r.listingId,r])).values()];
 const buckets:[string,RegExp][]=[['Koyu / moody',/\b(dark|moody|black)\b/i],['Vintage / antik',/\b(vintage|antique|victorian)\b/i],['Orman / manzara',/\b(forest|woodland|landscape|scenic)\b/i],['Çiçek / kır çiçeği',/\b(floral|flower|flowers|wildflower|wildflowers)\b/i],['Chinoiserie / toile',/\b(chinoiserie|toile)\b/i],['Tropikal',/\b(tropical|palm|jungle)\b/i]];
 const counts=new Map<string,Set<string>>();for(const r of all){const s=counts.get(r.listingId)||new Set();s.add(r.query);counts.set(r.listingId,s);}
 return {version:topListingVersion,files:imports.length,sourceRows:all.length,uniqueListings:unique.length,uniqueShops:new Set(unique.map(r=>r.shop.trim().toLowerCase()).filter(Boolean)).size,overlappingListings:[...counts.values()].filter(s=>s.size>1).length,
 byQuery:[...new Set(imports.map(b=>b.query))].map(query=>{const rows=all.filter(r=>r.query===query);return {query,rows:rows.length,uniqueListings:new Set(rows.map(r=>r.listingId)).size,shops:new Set(rows.map(r=>r.shop.trim().toLowerCase()).filter(Boolean)).size};}),
 titleThemes:buckets.map(([label,re])=>({label,count:unique.filter(r=>re.test(r.title)).length})),
 digitalOrBackdropCandidates:unique.filter(r=>/\b(digital|download|backdrop|backgrounds|clipart)\b/i.test(r.title)).map(r=>({listingId:r.listingId,title:r.title,query:r.query})).slice(0,20),
 youngListings:unique.filter(r=>r.metrics['Age (Days)']?.kind==='exact'&&r.metrics['Age (Days)'].value!<365).length,
 estimatedPositiveListings:unique.filter(r=>r.metrics['Est. Sales']?.kind==='exact'&&r.metrics['Est. Sales'].value!>0).length,
 actualOrders:null,shopAge:null,reviewGrowth:null,trend:null,successProbability:null,
 limits:['Başlık kümeleri metin eşleşmesidir; görseller incelenmedi ve müşteri niyeti doğrulanmadı.','Age (Days) ilan yaşıdır; mağaza yaşı değildir.','Est. Sales / Est. Revenue tahmindir; gerçek sipariş/gelir değildir ve toplanmadı.','Fiyat birimi ve para birimi doğrulanmadan fiyat bandı hesaplanmadı.','Tek çekimden trend/yorum artışı çıkarılmaz. Arama örneklemi pazarı temsil etmez.','Farklı çekimlerdeki aynı ilan ayrı gözlem olarak korunur; arşiv toplamında bir kez sayılır.'],
 sources:imports.map(({rows,...b})=>({...b,rows:rows.length}))};
}
