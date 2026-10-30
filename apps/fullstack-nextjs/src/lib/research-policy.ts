// Central rules shared by deterministic reports and optional model instructions.
export const researchPolicyVersion='research-evidence-v1';
export const researchRules=[
 'Yorum artışı ve araçların satış tahmini gerçek sipariş sayısı değildir; yalnız kaynak ve tarihi belirtilen hareket/tahmin göstergesidir.',
 'eRank CTR’si kendi ilanın tıklama oranı veya satış dönüşümü değildir. Farklı kaynakların oranları birbirinin yerine kullanılmaz.',
 'Yeni mağaza örnekleri fırsat gösterebilir; girişin kolaylığını veya başarı olasılığını kanıtlamaz.',
 '20 mağaza / 50 ilan pilot hedefidir; 0–16 puan eşikleri istatistiksel yeterlilik veya başarı garantisi değildir. Eksik bilgi bilinmiyor olarak tutulur, sıfır puan sayılmaz.'
] as const;
export function evidenceMeaning(kind:'review-growth'|'estimated-sales'|'erank-ctr'|'new-shop'|'actual-orders',value:number|null){
 if(value===null)return {value:null,state:'UNKNOWN',actualOrders:null,successProbability:null} as const;
 if(!Number.isFinite(value)||value<0)throw Error('Geçersiz gözlem değeri.');
 return {value,state:kind==='actual-orders'?'MEASURED':'INDICATOR_ONLY',actualOrders:kind==='actual-orders'?value:null,successProbability:null} as const;
}
export function evidenceCoverage(values:readonly (number|null)[]){
 const known=values.filter((v):v is number=>v!==null);
 if(known.some(v=>!Number.isFinite(v)))throw Error('Geçersiz gözlem değeri.');
 return {known:known.length,unknown:values.length-known.length,total:values.length,score:null,successProbability:null};
}
export const researchPolicyInstruction=researchRules.join(' ');
