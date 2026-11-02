import {env} from "cloudflare:workers";
import {HttpError} from "./server";

export async function structuredAI(name:string,schema:Record<string,unknown>,instructions:string,input:unknown){
 if(!env.OPENAI_API_KEY)throw new HttpError(503,"Yapay zekâ bağlantısı henüz kurulmamış. OpenAI bağlantısını tamamla; fikrin burada kalacak.");
 let r:Response;
 try{r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions,input:JSON.stringify(input),store:false,max_output_tokens:6000,reasoning:{effort:"low"},text:{format:{type:"json_schema",name,strict:true,schema}}}),signal:AbortSignal.timeout(110000)});}catch{throw new HttpError(504,"Yapay zekâ çağrısı zamanında tamamlanmadı. Ücretli çağrı otomatik tekrarlanmadı.");}
 const raw=await r.json() as any;
 if(!r.ok)throw new HttpError(r.status===429?429:502,r.status===401?"OpenAI anahtarı geçersiz.":r.status===429?"OpenAI kotası veya hız sınırı doldu. Hesabın API bakiyesini kontrol et.":"Yapay zekâ sağlayıcısı isteği tamamlayamadı.");
 if(raw.status!=="completed")throw new HttpError(502,"Yapay zekâ yanıtı tamamlanmadı. Eksik sonuç başarıyla kaydedilmedi.");
 const content=(raw.output||[]).flatMap((x:any)=>x.content||[]);
 if(content.some((c:any)=>c.type==="refusal"))throw new HttpError(422,"Bu fikir için üretim yapılamadı. Daha farklı ve özgün bir tasarım fikri dene.");
 const text=content.filter((c:any)=>c.type==="output_text").map((c:any)=>c.text).join("");
 try{return{value:JSON.parse(text),usage:{model:raw.model,inputTokens:raw.usage?.input_tokens??null,outputTokens:raw.usage?.output_tokens??null},responseId:raw.id};}catch{throw new HttpError(502,"Yapay zekâ sonucu okunamadı; alanlar doldurulmuş gibi gösterilmedi.");}
}

export async function generateMaster(prompt:string,kind:string){
 if(!env.OPENAI_API_KEY)throw new HttpError(503,"Yapay zekâ bağlantısı eksik.");
 let r:Response;try{r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_IMAGE_MODEL||"gpt-image-2",prompt,n:1,size:kind==="pattern"?"1024x1024":"1536x1024",quality:"medium",output_format:"png"}),signal:AbortSignal.timeout(180000)});}catch{throw new HttpError(504,"Görsel çağrısının sonucu belirsiz. İkinci ücret oluşmaması için otomatik tekrar yapılmadı; üretilmiş metin paketin korunuyor.");}
 const raw=await r.json() as any;
 if(!r.ok)throw new HttpError(r.status===429?429:502,r.status===403?"OpenAI hesabının görsel üretim erişimi doğrulanmalı.":r.status===429?"Görsel üretim kotası doldu. Metin paketin kaydedildi.":"Görsel üretimi tamamlanamadı. Metin paketin korunuyor.");
 const encoded=raw.data?.[0]?.b64_json;if(typeof encoded!=="string")throw new HttpError(502,"Sağlayıcı görsel dosyası döndürmedi.");
 const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return{bytes,model:env.OPENAI_IMAGE_MODEL||"gpt-image-2",usage:raw.usage||null};
}
