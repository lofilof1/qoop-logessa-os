import {csvTable,detectMapping} from './csv-research';
export function classifyResearchCsv(text:string){
 const {headers}=csvTable(text);
 if(['Listing','Listing URL','Shop'].every(h=>headers.includes(h)))return 'listing' as const;
 if(detectMapping(headers).term)return 'keyword' as const;
 throw Error('Dosyada eRank kelime veya Top Listings sütunları bulunamadı.');
}
export function researchQuery(name:string){return name.replace(/^eRank - Keyword Tool - /i,'').replace(/ - Top Listings(?: \(\d+\))?\.csv$/i,'').replace(/\.csv$/i,'').slice(0,160);}
