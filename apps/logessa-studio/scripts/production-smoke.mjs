import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {marketPackage} from '../lib/market-package.ts';
const png=await readFile(new URL('../public/example-botanical.png',import.meta.url));
const metrics={object:'list',data:[{id:'100',keyword:'botanical wallpaper',volume:{etsy_monthly:5000},competition:{competing_listings:50000,level:'moderate'},trend:{change_3m:.12},as_of:'2026-10-30T00:00:00Z'}],pending:[],unfetched:[]};
const pkg=marketPackage({idea:'botanik',kind:'pattern',templateId:'botanical'},{keywords:[],summary:{topKeyword:null},warnings:[]});
let textCalls=0,imageCalls=0,aluraCalls=0,failImage=false;
const moduleRoot=new URL("../dist/server/",import.meta.url).pathname.replace(/^\/(.:)/,"$1");
const moduleNames=(await readdir(moduleRoot,{recursive:true})).filter(p=>/\.(js|mjs)$/.test(p));
const moduleList=await Promise.all(moduleNames.map(async p=>({type:"ESModule",path:moduleRoot+p.replaceAll("\\","/"),contents:await readFile(moduleRoot+p,"utf8")})));
const mf=new Miniflare({name:'logessa-test',modules:moduleList,modulesRoot:moduleRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],bindings:{ALURA_API_KEY:'test-fixture-only',OPENAI_API_KEY:'test-fixture-only'},d1Databases:{DB:'test-database'},r2Buckets:['BUCKET'],outboundService:async req=>{
 const url=new URL(req.url);
 if(url.hostname==='api.alura.io'){aluraCalls++;let data=metrics;if(url.pathname.endsWith('/related'))data={data:[{...metrics.data[0],id:'101',keyword:'olive wallpaper'}]};if(url.pathname.endsWith('/products'))data={data:[{id:'1',title:'Botanical wallpaper',price:{usd:'35.00'},shop:{name:'Fixture Shop'},sales:{est_monthly_avg:25}}]};return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Alura-Credits-Cost':'1','Alura-Credits-Remaining':'99'}});}
 if(url.hostname==='api.openai.com'&&url.pathname==='/v1/responses'){textCalls++;const body=await req.json(),value=body.text.format.name==='wallpaper_research_plan'?{seedKeywords:['botanical wallpaper'],direction:'Özgün botanik desen yönü için test planı.'}:pkg;return new Response(JSON.stringify({id:'fixture-response',status:'completed',model:'test-fixture',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:100,output_tokens:200}}),{headers:{'Content-Type':'application/json'}});}
 if(url.hostname==='api.openai.com'&&url.pathname==='/v1/images/generations'){imageCalls++;return new Response(JSON.stringify(failImage?{error:{message:'fixture failure'}}:{data:[{b64_json:png.toString('base64')}]}),{status:failImage?500:200,headers:{'Content-Type':'application/json'}});}
 throw new Error('Unexpected test network destination: '+url.hostname);
}});
const headers={'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'test@local.invalid',Origin:'https://studio.test','Content-Type':'application/json'};
const call=async(path,body,method=body?'POST':'GET',owner='test-owner')=>{const r=await mf.dispatchFetch('https://studio.test'+path,{method,headers:{...headers,'oai-authenticated-user-id':owner},body:body?JSON.stringify(body):undefined});const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{throw new Error(r.status+': '+raw.slice(0,300));}return{status:r.status,data};};
try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();}
 const input={idea:'botanik',kind:'pattern',templateId:'botanical',withImage:true,mode:'ai',requestId:crypto.randomUUID()};
 let response=await call('/api/production',input);assert.equal(response.status,201,JSON.stringify(response.data));let job=response.data;
 assert.equal((await call('/api/production',input)).data.id,job.id,'same click is idempotent');
 assert.equal((await call(`/api/production/${job.id}`,undefined,'GET','other-user')).status,404,'cross-user job access rejected');
 const first=await Promise.all([call(`/api/production/${job.id}`,{action:'advance'}),call(`/api/production/${job.id}`,{action:'advance'})]);assert.equal(textCalls,1,'concurrent advance calls only bill once');
 job=(await call(`/api/production/${job.id}`)).data;
 for(let i=0;i<5&&job.status!=='complete';i++)job=(await call(`/api/production/${job.id}`,{action:'advance'})).data;
 assert.equal(job.status,'complete',JSON.stringify(job));assert(job.output.evidence.keywords.length===2);assert.equal(textCalls,2);assert.equal(imageCalls,1);
 const design=(await call(`/api/designs/${job.designId}`)).data;assert(design.body.title&&design.body.tags.length===13&&design.body.prompt&&design.body.palette&&design.body.imageId);assert.equal(design.body.widthPx,design.body.heightPx);
 const asset=await mf.dispatchFetch('https://studio.test/api/assets/'+design.body.imageId,{headers});assert(Buffer.from(await asset.arrayBuffer()).equals(png));
 await call(`/api/production/${job.id}`,{action:'advance'});assert.equal(imageCalls,1,'completed job never repeats image generation');
 const market=(await call('/api/production',{...input,mode:'market',withImage:false,requestId:crypto.randomUUID()})).data;let m=market;for(let i=0;i<4&&m.status!=='complete';i++)m=(await call(`/api/production/${market.id}`,{action:'advance'})).data;assert.equal(m.status,'complete');assert.equal(textCalls,2,'Alura-only mode makes no AI calls');assert.equal(m.output.mode,'market');
 const priorCalls=aluraCalls;const seasonal=await call('/api/seasonal',{keywords:['botanical wallpaper']});assert.equal(seasonal.status,200);assert.equal(seasonal.data.data[0].searches,5000);assert.equal(seasonal.data.cached,true);assert.equal(seasonal.data.cost,0);assert.equal(aluraCalls,priorCalls,'season radar reuses research cache');assert.equal((await call('/api/seasonal',{keywords:['a1','a2','a3','a4']})).status,400,'season request capped at 3 terms');const ownHistory=(await call('/api/research')).data,otherHistory=(await call('/api/research',undefined,'GET','other-user')).data;assert(ownHistory.some(r=>r.kind==='seasonal'));assert(!otherHistory.some(r=>r.kind==='seasonal'),'season observations remain owner-only');
 failImage=true;let failed=(await call('/api/production',{...input,requestId:crypto.randomUUID()})).data;for(let i=0;i<5&&failed.status!=='failed';i++)failed=(await call(`/api/production/${failed.id}`,{action:'advance'})).data;assert.equal(failed.status,'failed');assert(failed.designId,'text package survives image failure');const billed=imageCalls;await call(`/api/production/${failed.id}`,{action:'advance'});assert.equal(imageCalls,billed,'failed image is not automatically billed again');
 console.log('PASS: full production with isolated test providers; ownership, click idempotency, concurrent leases, 13 tags, original asset bytes, Alura-only mode, cached research, partial failure retention, no automatic image retry.');
}finally{await mf.dispose();}
