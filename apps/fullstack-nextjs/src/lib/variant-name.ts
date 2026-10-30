type Source={prompt:string;raw:unknown};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const clean=(v:unknown,max=65)=>typeof v==='string'?v.replace(/--[a-z][\s\S]*/i,'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max).trim():'';
export const genericVariantLabels=['Onaylı prompttan yüklenen görsel','Onaylanan üretim','Düzenleme · onaylı prompt, görsel bekleniyor'];
export function automaticVariantName(title:string,source?:Source|null){
 const raw=object(source?.raw),brief=object(raw.brief),values=object(brief.values),custom=object(brief.custom);
 const field=(key:string)=>clean(values[key]==='__other__'?custom[key]:values[key]);
 const parts=[field('primary'),field('medium'),field('palette')].filter(v=>v&&!/^(yok|henüz|belirlenmedi|seç)/i.test(v));
 const mode=clean(brief.mode||raw.sourceMode);
 const label:Record<string,string>={pattern:'Seamless pattern',mural:'Mural',continuous:'Seamless mural',motif:'Tekil motif',edit:'Düzenleme'};
 if(!parts.length&&source?.prompt){
  const text=source.prompt.split(/\n|[.!?]\s/).map(v=>v.replace(/^(?:subject|primary motif|main motif|ana motif)\s*:\s*/i,'').trim()).find(v=>v.length>5&&!/^(create|generate|produce|draw|final tile|output|avoid|negative|no |grid|coordinates|seam|match|exact|all |both |left|right|top|bottom|x\d|four-edge|cohesive scenic|continuous scenic)/i.test(v));
  if(text)parts.push(clean(text,100));
 }
 if(!parts.length)parts.push(clean(title.replace(/\s*·\s*Düzenleme$/,''),100)||'Tasarım');
 if(label[mode])parts.push(label[mode]);
 return [...new Set(parts)].join(' · ').slice(0,200);
}
