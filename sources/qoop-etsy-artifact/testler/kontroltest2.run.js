const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const data=JSON.parse(fs.readFileSync(__dirname+'/mockreal.json','utf8'));
  const html=fs.readFileSync(__dirname+'/index.html','utf8');
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.text().startsWith('SUB')) console.log(m.text()); if(m.type()==='error') errs.push(m.text()); });
  await p.addInitScript(d=>{
    const store={items:{},adaylar:{},promptlar:{},recipes:{},kelime_dosyalari:{}};
    d.items.forEach(x=>{const id=x._id; delete x._id; store.items[id]=x;});
    d.adaylar.forEach(x=>{const id=x._id; delete x._id; store.adaylar[id]=x;});
    const subs=[];
    const snap=(col)=>({docs:Object.entries(store[col]||{}).map(([id,v])=>({id,data:()=>v})).sort((a,b)=>(b.data().createdAt||0)-(a.data().createdAt||0))});
    const fire=()=>subs.forEach(([c,fn])=>fn(snap(c)));
    let n=0;
    const docRef=(col,id)=>({id, set:async v=>{store[col][id]=v;fire();}, update:async v=>{store[col][id]={...store[col][id],...v};fire();}, get:async()=>({exists:!!store[col][id],data:()=>store[col][id]}), delete:async()=>{delete store[col][id];fire();}});
    const coll=col=>{ store[col]=store[col]||{}; const q={orderBy:()=>q,limit:()=>q,where:()=>q,onSnapshot:(fn)=>{console.log('SUB',col,Object.keys(store[col]).length);subs.push([col,fn]);setTimeout(()=>fn(snap(col)),0);return()=>{};},doc:(id)=>docRef(col,id||('n'+(++n)))}; return q; };
    const db={collection:coll, doc:path=>{const [c,id]=path.split('/'); return {onSnapshot:fn=>{setTimeout(()=>fn({exists:false,data:()=>({})}),0);return()=>{}}, ...docRef(c,id)}}};
    const _of=window.fetch; window.fetch=async(u,...a)=>String(u).startsWith('/_blob/')?new Response(new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'})):_of(u,...a);
    const sample=async(inp,opts)=>{ if(/Qoop Design Score/.test(inp)){ window.__qds=inp; return {text:JSON.stringify({gorsel_okundu:!window.__blind,korunacaklar:['emerald background','peony clusters'],qds:{ic:{p:4,k:'mobilyayla dengeli'},estetik:{p:4,k:'renk uyumlu'},uretim:{p:3,k:'ince dallar'},ticari:{p:null,k:'veri yok'},koleksiyon:{p:4,k:'aile ile tutarlı'}},zayifliklar:['ince dallar','merkez yoğun','kontrast'],revizyon:'merkez yoğunluğunu azalt',revizyon_prompt:'Reduce density in the centre and remove peony clusters near edges.',uretim_riskleri:['ince detay'],qc:{halo:'gozlenemedi',form:'kaldi'},stil:{kontrast:2,doygunluk:2,yogunluk:4,kenar:2,doku:3},karar:'REVISE'})}; } if(/Etsy SEO/.test(inp)){ window.__lst=inp; return {text:JSON.stringify({baslik:"Chinoiserie Wallpaper, Emerald Peony Bird Mural, Vintage Botanical Peel and Stick",etiketler:["chinoiserie wallpaper","peony wallpaper","bird mural","emerald wallpaper","vintage botanical","a very long tag that is too long","asian floral decor","green wallpaper","living room mural","bedroom wallpaper","statement wall","hand painted look","Peony Wallpaper"],aciklama:"Bring timeless chinoiserie to your walls... [MALZEME VE UYGULAMA BİLGİSİ]",gerekce:"İlk 3 satan ilanın başlık dili."})}; } window.__inp=inp; if(opts&&opts.images){ return {text:"## Kontroller\n- Ölçek: Evet"}; } const t=JSON.stringify({baslik:"Zümrüt zeminli kuş ve şakayık",tip:window.__tip||"tekrarlı desen",olcek:{ana_motif:"şakayık kümesi 25 cm",odak:"karo merkezi"},prompt:"Seamless repeating pattern tile of peonies and songbirds on deep emerald #0F3D2E ground...",negatif:"text, watermark",palet:["#0F3D2E","#D9A441","#F2E6D0"],dayanak:"1 ve 3 numaralı referansların paleti ve motif ölçeği.",referanslar:[1,3]}); opts?.onText?.({text:t}); return {text:t,truncated:false}; };
    sample.limits=async()=>({images:{maxCount:4}});
    const assets={upload:async()=>({id:'a1'}),list:async()=>({assets:[],usage:{bytes:1,maxBytes:100}})};
    window.claude={use:async n=>({db,sample,assets,downloads:{save:async()=>{}}})[n]||null};
  }, data);
  await p.goto('file://'+__dirname+'/index.html'); await p.waitForTimeout(800);
  await p.screenshot({path:__dirname+'/s1.png'});



  await p.click('.temarow .btn.primary'); await p.waitForTimeout(800);
  await p.setInputFiles('.gorselFile', __dirname+'/s5.png'); await p.waitForTimeout(1800);
  await p.click('[data-tab="kontrol"]'); await p.waitForTimeout(2000);
  console.log('auto qds called', !!(await p.evaluate(()=>window.__qds)));
  console.log('skor', await p.textContent('.kskor'));
  console.log('selects', await p.$$eval('.kdetay select',e=>e.slice(0,16).map(x=>(x.getAttribute('aria-label')||'')+'='+x.value).join(' | ')));
  console.log('aibox', (await p.textContent('.kaibox')).slice(0,160));
  console.log('toplu btn', await p.$$eval('.klist button.primary',e=>e.map(x=>x.textContent)));
  await p.click('[data-tab="kullan"]'); await p.waitForTimeout(400);
  console.log('used items', await p.$$eval('.uitem',e=>e.map(x=>x.open+':'+x.querySelector('summary').textContent)));
  await p.click('.uitem > summary'); await p.waitForTimeout(300);
  console.log('opened', await p.$eval('.uitem',e=>e.open), (await p.textContent('.uitem .ubody')).slice(0,120));
  await p.screenshot({path:__dirname+'/s13.png',fullPage:true});
  console.log('errors',errs.filter(x=>!/ERR_FILE|TUNNEL/.test(x))); await b.close(); })();
