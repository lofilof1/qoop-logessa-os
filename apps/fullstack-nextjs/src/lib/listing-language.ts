// Customer-facing Etsy copy is English; internal review notes may be Turkish.
export const customerLanguageVersion='english-customer-copy-v1';
const turkishWords=new Set('ve bir bu ile icin olan olarak cok daha renk renkler renkleri duvar kagit kagidi tasarim tasarimi desen desenli cicek cicekler cicekleri yaprak yapraklar yapraklari yesil kirmizi turuncu mavi koyu acik beyaz siyah pembe altin sari kahverengi mutfak banyo ofis yatak odasi salon manzara orman gol dogal yumusak sakin modernlik suluboya yagli boya tropikal geometrik yogun yapay sanat arka plani aciklama baslik etiket numune uretim kargo olcu dokulu gorunum'.split(' '));
export function englishCopyIssues(value:string):string[]{
 const lower=value.toLowerCase();
 const found:string[]=[];
 if(/[çğıöşü]/.test(lower))found.push('Turkish characters');
 if(/[\u0400-\u052f\u0600-\u06ff\u4e00-\u9fff]/.test(value))found.push('Non-English script');
 const tokens=lower.match(/[a-z]+(?:'[a-z]+)*/g)||[];
 for(const word of new Set(tokens))if(turkishWords.has(word))found.push(word);
 return found;
}
export function assertEnglishCustomerCopy(copy:{title:string;tags:string[];description:string}){
 const fields={title:copy.title,tags:copy.tags.join(' '),description:copy.description};
 for(const [field,text] of Object.entries(fields))if(englishCopyIssues(text).length)throw Error(`ENGLISH_COPY_REQUIRED: ${field} contains non-English wording. Customer-facing title, tags and description must be English; only internal review notes may be Turkish.`);
}
export function englishAltSource(description:string){
 const opening=description.split(/Design details:|📏|SIZE & CUSTOM ORDERS/)[0].split(/\n\s*\n/).filter(p=>!p.includes('| LOGESSA')).join(' ').trim();
 return englishCopyIssues(opening).length?'':opening;
}
