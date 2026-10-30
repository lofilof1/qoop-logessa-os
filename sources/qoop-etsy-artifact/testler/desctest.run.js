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
    const sample=async(inp,opts)=>{ if(/Etsy SEO/.test(inp)){ window.__lst=inp; return {text:JSON.stringify({seo:{etsy_baslik:"Water Reflections Wall Mural, Reeds and Soft Sky Landscape"},etiketler:["chinoiserie wallpaper","peony wallpaper","bird mural","emerald wallpaper","vintage botanical","a very long tag that is too long","asian floral decor","green wallpaper","living room mural","bedroom wallpaper","statement wall","hand painted look","Peony Wallpaper"],acilis:"Water reflections wall mural with reeds and a soft sky. Muted beige, gray and blue tones bring calm.",detaylar:["Calm water with soft reflections","Reeds along the shoreline","Soft mountain silhouette"],fikirler:["Living room accent wall","Behind the bed","Home office"],gerekce:"İlk 3 satan ilanın başlık dili."})}; } window.__inp=inp; if(opts&&opts.images){ return {text:"## Kontroller\n- Ölçek: Evet"}; } const t=JSON.stringify({baslik:"Zümrüt zeminli kuş ve şakayık",tip:window.__tip||"tekrarlı desen",olcek:{ana_motif:"şakayık kümesi 25 cm",odak:"karo merkezi"},prompt:"Seamless repeating pattern tile of peonies and songbirds on deep emerald #0F3D2E ground...",negatif:"text, watermark",palet:["#0F3D2E","#D9A441","#F2E6D0"],dayanak:"1 ve 3 numaralı referansların paleti ve motif ölçeği.",referanslar:[1,3]}); opts?.onText?.({text:t}); return {text:t,truncated:false}; };
    sample.limits=async()=>({images:{maxCount:4}});
    const assets={upload:async()=>({id:'a1'}),list:async()=>({assets:[],usage:{bytes:1,maxBytes:100}})};
    window.claude={use:async n=>({db,sample,assets,downloads:{save:async()=>{}}})[n]||null};
  }, data);
  await p.goto('file://'+__dirname+'/index.html'); await p.waitForTimeout(800);
  await p.screenshot({path:__dirname+'/s1.png'});


  await p.click('.temarow .btn.primary'); await p.waitForTimeout(800);
  await p.exposeFunction('__log',x=>console.log('TOAST',x)); await p.evaluate(()=>{ new MutationObserver(()=>{ const t=document.querySelector('.toast,#toast'); if(t) window.__log(t.textContent); }).observe(document.body,{subtree:true,childList:true,characterData:true}); });
  await p.setInputFiles('.gorselFile', __dirname+'/s5.png'); await p.waitForTimeout(2500);
  await p.click('.wsbtn:has-text("Açıklama")'); await p.waitForTimeout(600);
  console.log('wsbody', (await p.textContent('.wsbody')).slice(0,500)); console.log('lst', (await p.evaluate(()=>window.__lst||'')).length);
  const v=await p.$$eval('textarea',e=>e.map(x=>x.value).find(x=>x.includes('Design details'))||'YOK');
  console.log(v);
  console.log('dup design process?', (v.match(/Design process/g)||[]).length);
  console.log('btn', !!(await p.$('text=Standart şablonla yeniden kur')));
  console.log('warn', await p.$$eval('.warnbox',e=>e.map(x=>x.textContent)));
  console.log('errors',errs.filter(x=>!/ERR_FILE|TUNNEL/.test(x))); await b.close(); })();
