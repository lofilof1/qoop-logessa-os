import {env} from "cloudflare:workers";
import {database,HttpError} from "./server";
import {keywordMetric,mergeKeyword,competitorMetric,marketSummary,type KeywordMetric,type Competitor} from "./market-analysis";

type CachedResult={raw:any;cached:boolean;fetchedAt:string;cost:number;remaining:string|null};
export async function aluraRead(owner:string,path:string,params:URLSearchParams=new URLSearchParams(),ttl=86400000):Promise<CachedResult>{
 if(!env.ALURA_API_KEY)throw new HttpError(503,"Alura bağlantısı eksik. Sunucu anahtarı yapılandırılmalı.");
 const url=new URL(`https://api.alura.io/v1/${path}`);url.search=params.toString();const key=url.pathname+url.search,db=database();
 const cached=await db.prepare("SELECT body,fetched_at FROM research WHERE owner=? AND kind='cache:alura' AND query=? ORDER BY fetched_at DESC LIMIT 1").bind(owner,key).first<{body:string;fetched_at:string}>();
 if(cached&&Date.now()-Date.parse(cached.fetched_at)<ttl){const saved=JSON.parse(cached.body);return{...saved,raw:saved.raw,cached:true,cost:0,fetchedAt:cached.fetched_at};}
 let response:Response;try{response=await fetch(url,{headers:{Authorization:`Bearer ${env.ALURA_API_KEY}`,Accept:"application/json"},signal:AbortSignal.timeout(25000)});}catch{throw new HttpError(504,"Alura zamanında yanıt vermedi. Araştırma otomatik tekrarlanmadı.");}
 if(!response.ok){const messages:Record<number,string>={400:"Alura sorguyu kabul etmedi.",401:"Alura anahtarı geçersiz.",403:"Alura anahtarının yetkisi veya plan erişimi bu işlem için yeterli değil.",429:"Alura kredi veya hız sınırına ulaşıldı."};throw new HttpError(response.status===429?429:502,messages[response.status]||"Alura şu anda yanıt veremiyor.");}
 const raw=await response.json() as any,cost=Number(response.headers.get("Alura-Credits-Cost")||0),remaining=response.headers.get("Alura-Credits-Remaining"),fetchedAt=new Date().toISOString();
 if(Array.isArray(raw.data)?raw.data.length>0:raw.object==="usage")await db.prepare("INSERT INTO research (id,owner,kind,query,body,fetched_at) VALUES (?,?, 'cache:alura',?,?,?)").bind(crypto.randomUUID(),owner,key,JSON.stringify({raw,remaining}),fetchedAt).run();
 return{raw,cached:false,cost,remaining,fetchedAt};
}
export function resolveSeed(idea:string,kind="pattern"){
 const text=idea.trim().toLocaleLowerCase("tr");const suffix=kind==="mural"?"wall mural":kind==="art"?"wall art":"wallpaper";
 const words:Record<string,string>={botanik:"botanical",çiçek:"floral",cicek:"floral",kuş:"bird",kus:"bird",kedi:"cat",orman:"woodland",deniz:"ocean",dağ:"mountain",dag:"mountain",çocuk:"nursery",cocuk:"nursery",yıldız:"celestial",yildiz:"celestial",zeytin:"olive",sakura:"cherry blossom",minimal:"minimalist",japandi:"japandi",mantar:"mushroom",bahçe:"garden",bahce:"garden"};
 const seed=words[text]||idea.trim();return /wallpaper|wall mural|wall art/i.test(seed)?seed:`${seed} ${suffix}`;
}
export async function discoverMarket(owner:string,seeds:string[],includeProducts=true){
 const clean=[...new Set(seeds.map(s=>s.trim().toLowerCase()).filter(Boolean))].slice(0,3),query=new URLSearchParams({language:"en"});clean.forEach(q=>query.append("q",q));
 const base=await aluraRead(owner,"research/keywords",query);let cost=base.cost,remaining=base.remaining;const warnings:string[]=[],all=[...(base.raw.data||[])];const sources=[{operation:"keyword_lookup",cached:base.cached,fetchedAt:base.fetchedAt,cost:base.cost}];
 const seed=(base.raw.data||[])[0];
 if(seed?.id){try{const related=await aluraRead(owner,`research/keywords/${encodeURIComponent(seed.id)}/related`);all.push(...(related.raw.data||[]));cost+=related.cost;remaining=related.remaining??remaining;sources.push({operation:"related_keywords",cached:related.cached,fetchedAt:related.fetchedAt,cost:related.cost});}catch(e){warnings.push((e as Error).message);}}
 if(base.raw.pending?.length)warnings.push(`${base.raw.pending.join(", ")}: Alura veriyi hazırlıyor. Bu kelimeler için ölçüm henüz yok.`);
 if(base.raw.unfetched?.length)warnings.push("Bazı kelimelerin verisi şu anda alınamadı; eksik değerler tahminle doldurulmadı.");
 const dedup=new Map<string,KeywordMetric>();for(const k of all){const row=keywordMetric(k);if(row.keyword){const key=row.keyword.toLowerCase();dedup.set(key,mergeKeyword(dedup.get(key),row));}}
 const keywords=[...dedup.values()].sort((a,b)=>(b.score??-1)-(a.score??-1));let products:Competitor[]=[];
 if(includeProducts){try{const p=await aluraRead(owner,"research/products",new URLSearchParams({q:clean[0],limit:"25",sort:"est_monthly_sales",fields:"id,title,price.usd,sales.est_monthly_avg,shop.name,as_of"}));products=(p.raw.data||[]).map(competitorMetric);cost+=p.cost;remaining=p.remaining??remaining;sources.push({operation:"competitor_products",cached:p.cached,fetchedAt:p.fetchedAt,cost:p.cost});}catch(e){warnings.push((e as Error).message);}}
 const evidence={seeds:clean,keywords,products,summary:marketSummary(keywords,products),warnings,sources,cost,remaining,fetchedAt:new Date().toISOString(),methodology:"Araştırma skoru: logaritmik talep %60, ters logaritmik rekabet %25, 3 aylık değişim %15. Eksik bileşenlerin ağırlığı bilinenlere dağıtılır. Hacim bilinmiyorsa skor yoktur. Skor satış olasılığı değildir. Fiyat dağılımı ilk 25 rakipten, 10 USD altındaki olası numuneler hariç hesaplanır."};
 await database().prepare("INSERT INTO research (id,owner,kind,query,body,fetched_at) VALUES (?,?,'discovery',?,?,?)").bind(crypto.randomUUID(),owner,clean[0],JSON.stringify({...evidence,data:keywords}),evidence.fetchedAt).run();return evidence;
}
