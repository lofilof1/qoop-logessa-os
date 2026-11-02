"use client";
export type Research = {
    id?: string;
    kind: string;
    query: string;
    data: any;
    fetchedAt: string;
    cached: boolean;
    cost: string | null;
    remaining: string | null;
    pending?: string[];
    unfetched?: {
        keyword: string;
        code: string;
        retry_after?: number;
    }[];
    hasMore?: boolean;
};
const nf = new Intl.NumberFormat("tr-TR");
export function num(v: unknown) { return typeof v === "number" ? nf.format(v) : "Bilinmiyor"; }
export function date(v: string) { return new Date(v).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }); }
export async function api<T=any>(path:string,options?:RequestInit):Promise<T>{
 let r:Response;try{r=await fetch(path,{...options,credentials:"same-origin"});}catch{throw new Error("Sunucuya ulaşılamadı. Bağlantını kontrol et; devam eden üretim kaydı korunur.");}
 const text=await r.text();let data:any;try{data=JSON.parse(text);}catch{throw new Error(r.status===413?"Dosya veya istek boyutu sınırı aşıldı.":r.status===401||r.redirected?"Oturumun yenilenmeli. Çalışma alanına tekrar giriş yap.":"Sunucu okunabilir bir yanıt döndürmedi. Sayfayı yenileyip tekrar dene.");}
 if(!r.ok)throw new Error(data.error||"İşlem tamamlanamadı.");return data as T;
}
export const json = (body: unknown, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export function download(name: string, body: string, mime = "application/json") { const url = URL.createObjectURL(new Blob([body], { type: mime })), a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
