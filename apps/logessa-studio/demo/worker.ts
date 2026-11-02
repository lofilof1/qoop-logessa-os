// Browser-only demo backend. Never imports the live server, secrets or user data.
import {emptyBody,designInput,type Design} from '../lib/domain';
import {imageMetadata} from '../lib/image-metadata';
import {marketPackage} from '../lib/market-package';
import {keywordMetric,marketSummary} from '../lib/market-analysis';
import type {ProductionJob} from '../lib/production-schema';
type State={designs:Design[];jobs:ProductionJob[];history:any[];assets:Record<string,Blob>};
const sw=self as any;
const notice='DEMO: Sayılar örnek senaryodur; Alura’dan alınmamıştır. Gerçek talep, satış veya fiyat ölçümü değildir.';
const stamp=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function metrics(terms:string[]){return terms.map((keyword,i)=>keywordMetric({id:`example-${keyword}`,keyword,volume:{etsy_monthly:[2400,980,530,810,310,1750][i%6]},competition:{competing_listings:[42000,16000,4200,31000,7600,58000][i%6],level:'medium'},trend:{change_3m:[.24,.12,-.08,.36,.09,.17][i%6]},market:{avg_price_usd:38+i*3},as_of:stamp()}));}
function evidence(idea:string){const seed=idea.trim()||'botanical';const terms=[`${seed} wallpaper`,`${seed} wall decor`,'botanical wallpaper','olive wallpaper','nature wall decor','neutral wallpaper'];const keywords=metrics([...new Set(terms)]);const products=[24,35,49,59,68].map((price,i)=>({id:`example-product-${i}`,title:`Örnek dekoratif duvar ürünü ${i+1}`,shop:'Demo mağazası',price,monthlySales:12+i*8,asOf:stamp()}));return{demo:true,seeds:[seed],keywords,products,summary:marketSummary(keywords,products),warnings:[notice],sources:[],cost:0,remaining:null,fetchedAt:stamp(),methodology:'Örnek veri üzerinde çalışan gerçek skor ve dağılım hesapları.'};}
function design(name:string,kind='pattern',body=emptyBody()):Design{return{id:id(),name,kind,stage:'design',body,version:1,createdAt:stamp(),updatedAt:stamp(),archived:false};}
function seed():State{const e=evidence('botanical');const p=marketPackage({idea:'Botanik',kind:'pattern',templateId:'botanical'},e);const d=design('Botanik Hikâyeler · Örnek master','pattern',{...emptyBody(),imageId:'demo-botanical',widthPx:1254,heightPx:1254,collection:'Demo koleksiyonu',motif:p.motif,style:p.style,room:p.room,palette:p.palette.map(c=>c.hex).join(', '),prompt:p.imagePrompt,title:p.title,tags:p.tags,description:p.description,notes:notice});return{designs:[d],jobs:[],history:[{...e,id:id(),kind:'discovery',query:'botanical',data:e.keywords,cached:true}],assets:{}};}
const db=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('logessa-interactive-demo-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function read():Promise<State>{const d=await db;const state=await new Promise<State|undefined>((resolve,reject)=>{const r=d.transaction('state').objectStore('state').get('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(state)return state;const initial=seed();await write(initial);return initial;}
async function write(s:State){const d=await db;return new Promise<void>((resolve,reject)=>{const tx=d.transaction('state','readwrite');tx.objectStore('state').put(s,'workspace');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function handle(req:Request){const u=new URL(req.url),path=u.pathname,method=req.method,s=await read();let body:any={};if(['POST','PATCH'].includes(method)&&!path.startsWith('/api/assets'))body=await req.json();
 if(path==='/api/session')return respond({user:{name:'Demo ziyaretçisi'},aluraConfigured:false,aiConfigured:false,demo:true});
 if(path==='/api/designs'){
  if(method==='GET')return respond(s.designs);
  if(method==='POST'){const parsed=designInput.safeParse(body);if(!parsed.success)return respond({error:'Tasarım alanlarını kontrol et.'},400);const d=design(parsed.data.name,parsed.data.kind,parsed.data.body);s.designs.unshift(d);await write(s);return respond(d,201);}
 }
 if(path.startsWith('/api/designs/')){const key=path.split('/')[3],d=s.designs.find(x=>x.id===key);if(!d)return respond({error:'Tasarım bulunamadı.'},404);if(method==='GET')return respond(d);if(method==='PATCH'){if(body.version!==d.version)return respond({error:'Kayıt değişti. Yenileyip tekrar dene.'},409);const parsed=designInput.safeParse(body);if(!parsed.success)return respond({error:'Tasarım alanlarını kontrol et.'},400);Object.assign(d,parsed.data,{version:d.version+1,updatedAt:stamp()});await write(s);return respond(d);}}
 if(path==='/api/assets'&&method==='POST'){const d=s.designs.find(x=>x.id===u.searchParams.get('designId'));if(!d)return respond({error:'Tasarım bulunamadı.'},404);const bytes=await req.arrayBuffer();if(bytes.byteLength>15*1024*1024)return respond({error:'En fazla 15 MB yükle.'},413);const meta=imageMetadata(bytes);if(!meta)return respond({error:'Geçerli PNG, JPEG veya WebP seç.'},400);const key=id();s.assets[key]=new Blob([bytes],{type:meta.mime});await write(s);return respond({id:key,...meta,size:bytes.byteLength});}
 if(path.startsWith('/api/assets/')){const key=path.split('/')[3];if(key==='demo-botanical')return fetch('/example-botanical.png');const blob=s.assets[key];return blob?new Response(blob,{headers:{'Content-Type':blob.type,'Cache-Control':'no-store'}}):respond({error:'Görsel bulunamadı.'},404);}
 if(path==='/api/analytics'&&method==='POST'){const e=evidence(String(body.idea||''));s.history.unshift({...e,id:id(),kind:'discovery',query:body.idea,data:e.keywords,cached:true});await write(s);return respond(e);}
 if(path==='/api/research'){if(method==='GET')return respond(s.history);return respond({data:{plan:'İnteraktif demo · API bağlantısı yok',credits:{remaining:0,used:0}},cached:true,cost:0,remaining:null});}
 if(path==='/api/seasonal'&&method==='POST'){const data=metrics((body.keywords||[]).slice(0,3));s.history.unshift({id:id(),kind:'seasonal',query:body.keywords.join(' | '),data,fetchedAt:stamp(),cached:true,cost:'0',remaining:null});await write(s);return respond({data,fetchedAt:stamp(),cost:0,remaining:null,cached:true,pending:[],unfetched:[],warnings:[notice],demo:true});}
 if(path==='/api/production'){
  if(method==='GET')return respond(s.jobs);
  if(method==='POST'){if(!String(body.idea||'').trim())return respond({error:'Bir fikir yaz.'},400);const old=s.jobs.find(j=>j.output.requestId===body.requestId);if(old)return respond(old);const j:ProductionJob={id:id(),idea:body.idea,kind:body.kind||'pattern',withImage:false,status:'queued',step:'plan',designId:null,error:null,createdAt:stamp(),updatedAt:stamp(),leaseUntil:0,output:{requestId:body.requestId,templateId:body.templateId}};s.jobs.unshift(j);await write(s);return respond(j,201);}
 }
 if(path.startsWith('/api/production/')){const j=s.jobs.find(x=>x.id===path.split('/')[3]);if(!j)return respond({error:'İş bulunamadı.'},404);if(method==='GET')return respond(j);if(body.action==='advance'&&j.status!=='complete'){
  if(j.step==='plan'){j.output.plan={seedKeywords:[j.idea],direction:'Demo şablonu'};j.step='research';}
  else if(j.step==='research'){j.output.evidence=evidence(j.idea);s.history.unshift({...j.output.evidence,id:id(),kind:'discovery',query:j.idea,data:j.output.evidence.keywords,cached:true});j.step='compose';}
  else if(j.step==='compose'){const p=marketPackage({idea:j.idea,kind:j.kind as any,templateId:j.output.templateId||''},j.output.evidence);j.output.package=p;const d=design(p.name,j.kind,{...emptyBody(),collection:p.collection,motif:p.motif,style:p.style,room:p.room,palette:p.palette.map(x=>x.hex).join(', '),keyword:p.primaryKeyword,prompt:p.imagePrompt,title:p.title,tags:p.tags,description:p.description,notes:notice});s.designs.unshift(d);j.designId=d.id;j.step='done';j.status='complete';}
  j.updatedAt=stamp();await write(s);
 }return respond(j);}
 return respond({error:'Bu işlem interaktif demoda kullanılamıyor.'},404);
}
// Serialize IndexedDB read/modify/write operations, including concurrent page requests.
let queue=Promise.resolve();
sw.addEventListener('install',(e:any)=>e.waitUntil(sw.skipWaiting()));
sw.addEventListener('activate',(e:any)=>e.waitUntil(sw.clients.claim()));
sw.addEventListener('fetch',(e:any)=>{const u=new URL(e.request.url);if(u.origin!==sw.location.origin||!u.pathname.startsWith('/api/'))return;const task=queue.then(()=>handle(e.request)).catch(()=>respond({error:'Demo kaydı okunamadı. Tarayıcı depolama iznini ve boş alanını kontrol et.'},500));queue=task.then(()=>{});e.respondWith(task);});
