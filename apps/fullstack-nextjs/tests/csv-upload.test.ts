import {it,expect} from 'vitest';
import {classifyResearchCsv,researchQuery} from '../src/lib/csv-upload';
it('detects by columns rather than misleading filename',()=>{expect(classifyResearchCsv('Listing,Listing URL,Shop\na,https://etsy.com/listing/1,s')).toBe('listing');expect(classifyResearchCsv('Keywords,Average Searches\na,10')).toBe('keyword');});
it('rejects unrelated CSV without treating it as empty research',()=>{expect(()=>classifyResearchCsv('x,y\na,b')).toThrow('sütunları');});
it('normalizes duplicate export names to the same query',()=>{expect(researchQuery('eRank - Keyword Tool - striped wallpaper - Top Listings (1).csv')).toBe('striped wallpaper');});
