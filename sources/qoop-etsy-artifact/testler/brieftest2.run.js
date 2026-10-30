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
    const sample=async(inp,opts)=>{ if(/Etsy SEO/.test(inp)){ window.__lst=inp; return {text:JSON.stringify({baslik:"Chinoiserie Wallpaper, Emerald Peony Bird Mural, Vintage Botanical Peel and Stick",etiketler:["chinoiserie wallpaper","peony wallpaper","bird mural","emerald wallpaper","vintage botanical","a very long tag that is too long","asian floral decor","green wallpaper","living room mural","bedroom wallpaper","statement wall","hand painted look","Peony Wallpaper"],aciklama:"Bring timeless chinoiserie to your walls... [MALZEME VE UYGULAMA BİLGİSİ]",gerekce:"İlk 3 satan ilanın başlık dili."})}; } window.__inp=inp; if(opts&&opts.images){ return {text:"## Kontroller\n- Ölçek: Evet"}; } const t=JSON.stringify({baslik:"Zümrüt zeminli kuş ve şakayık",tip:window.__tip||"tekrarlı desen",olcek:{ana_motif:"şakayık kümesi 25 cm",odak:"karo merkezi"},prompt:"Seamless repeating pattern tile of peonies and songbirds on deep emerald #0F3D2E ground...",negatif:"text, watermark",palet:["#0F3D2E","#D9A441","#F2E6D0"],dayanak:"1 ve 3 numaralı referansların paleti ve motif ölçeği.",referanslar:[1,3]}); opts?.onText?.({text:t}); return {text:t,truncated:false}; };
    sample.limits=async()=>({images:{maxCount:4}});
    const assets={upload:async()=>({id:'a1'}),list:async()=>({assets:[],usage:{bytes:1,maxBytes:100}})};
    window.claude={use:async n=>({db,sample,assets,downloads:{save:async()=>{}}})[n]||null};
  }, data);
  await p.goto('file://'+__dirname+'/index.html'); await p.waitForTimeout(800);
  await p.screenshot({path:__dirname+'/s1.png'});


  await p.selectOption('.temarow select.tipsel','desen'); await p.waitForTimeout(200);
  await p.click('details.brif > summary'); await p.waitForTimeout(150);
  await p.selectOption('details.brif select[aria-label="Tekrar geometrisi"]','Half-drop'); await p.waitForTimeout(150);
  await p.selectOption('details.brif select[aria-label="Koleksiyon rolü"]','Supporting'); await p.waitForTimeout(150);
  console.log('hd warn', await p.$$eval('details.brif p',e=>e.map(x=>x.textContent).filter(t=>/Half-drop/.test(t))));
  await p.click('.temarow .btn.primary'); await p.waitForTimeout(800);
  const inp=await p.evaluate(()=>window.__inp||''); const i=inp.indexOf('Kullanıcı brifi'); console.log('BRIEF:\n',inp.slice(i,i+400));
  console.log('kolozet', await p.$$eval('.stepbox .sc2',e=>e.map(x=>x.textContent)));
  console.log('selects', await p.$$eval('.pcard2 .step select',e=>e.map(x=>x.value)));
  await p.click('.pcard2 details > summary'); await p.click('.bprep > summary'); await p.waitForTimeout(200);
  console.log('tekrar', await p.$$eval('.bprep .prompt',e=>e.map(x=>x.textContent).filter(t=>t.startsWith('Repeat'))));
  await p.fill('input[aria-label="Duvar genişliği"]','250'); await p.fill('input[aria-label="Duvar yüksekliği"]','260'); await p.selectOption('select[aria-label="Birim"]','cm'); await p.waitForTimeout(200);
  console.log('siparis', await p.$$eval('.bprep dl.kv',e=>e[e.length-1].textContent));
  console.log('errors',errs.filter(x=>!/ERR_FILE|TUNNEL/.test(x))); await b.close(); })();
