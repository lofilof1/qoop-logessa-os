export const keywordClasses = ['Stil / dönem','Motif','Renk','Oda / kullanım','Malzeme / teknik','Genel'] as const;
export function keywordClass(term:string, legacy='') {
 const t=term.toLowerCase();
 if (/\b(peel|stick|vinyl|grasscloth|waterproof|fabric|textured|non woven)\b/.test(t)) return 'Malzeme / teknik';
 if (/\b(terracotta|burgundy|green|blue|pink|teal|beige|cream|navy|sage|gold|black|white|yellow|red|gray|grey|brown|purple|mint)\b/.test(t)||legacy==='renk') return 'Renk';
 if (/\b(bedroom|bathroom|nursery|kids|playroom|living room|office|kitchen|dining|powder room|accent wall|lake house)\b/.test(t)||legacy==='oda') return 'Oda / kullanım';
 if (/\b(art deco|mcm|mid century|japandi|moroccan|chinoiserie|damask|vintage|retro|boho|moody|abstract|minimalist|scandinavian|western|cottagecore|geometric)\b/.test(t)||legacy==='stil') return 'Stil / dönem';
 if (/\b(floral|botanical|flower|bird|tree|forest|landscape|mushroom|monkey|dinosaur|butterfly|peacock|flamingo|stripe|striped|plaid|leaf|leaves|tropical|scallop|fan|mountain|lake)\b/.test(t)||legacy==='motif') return 'Motif';
 return 'Genel';
}
export function exactLegacy(value:unknown):number|null {
 if(typeof value==='number') return Number.isFinite(value)&&value>=0?value:null;
 return typeof value==='string' && /^\d+(\.\d+)?$/.test(value.trim()) ? Number(value):null;
}
export function keywordRatio(searches:number|null, competition:number|null, comparable:boolean) {
 return comparable && searches!==null && competition!==null && competition>0 ? searches/competition*1000 : null;
}
export function keywordRelevant(term:string) {
 return !/\b(cutecore|dark souls|scalamandre|cole and son|schumacher|digital download|wall panels|wall kit|tile|tiles|dollhouse|clearance|homedecor)\b/i.test(term);
}
