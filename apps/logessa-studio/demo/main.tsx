import {createRoot} from 'react-dom/client';
import Studio from '@/app/studio';
import '@/app/globals.css';
import './demo.css';
async function start(){
 if(!('serviceWorker' in navigator))throw new Error('Bu demo Service Worker destekleyen güncel bir tarayıcı gerektirir.');
 await navigator.serviceWorker.register('/demo-worker.js',{type:'module',scope:'/'});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));
 createRoot(document.getElementById('root')!).render(<><div className="demo-banner" role="note"><strong>İNTERAKTİF DEMO</strong><span>Pazar rakamları örnektir · AI / Alura çağrısı yapılmaz · Kayıtların ve yüklediğin görseller bu tarayıcıda saklanır.</span><a href="#mockup">Mockup’ı dene ↗</a></div><Studio/></>);
}
start().catch(e=>{const el=document.getElementById('root')!;el.textContent=`Demo açılamadı: ${e.message}`;});
