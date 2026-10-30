import {it,expect} from 'vitest';
import {englishCopyIssues,assertEnglishCustomerCopy,englishAltSource} from '../src/lib/listing-language';
it('rejects Turkish copy with and without Turkish characters',()=>{
 for(const text of ['Koyu mavi wallpaper','yesil yapraklar','Tropikal çiçekler','mutfak accent','A blue design ve green leaves'])expect(englishCopyIssues(text).length).toBeGreaterThan(0);
});
it('accepts natural English including apostrophes, ink names and brand',()=>{
 expect(englishCopyIssues("We've designed a blue floral mural by LOGESSA, printed with HP Latex inks.")).toEqual([]);
});
it('enforces English separately on title, tags and description',()=>{
 const good={title:'Blue floral wallpaper',tags:['floral design'],description:'Blue flowers on an ivory background.'};
 expect(()=>assertEnglishCustomerCopy(good)).not.toThrow();
 for(const bad of [{...good,title:'Mavi wallpaper'},{...good,tags:['yesil tones']},{...good,description:'A design with kirmizi flowers'}])expect(()=>assertEnglishCustomerCopy(bad)).toThrow(/ENGLISH_COPY_REQUIRED/);
});
it('excludes the product title and technical sections from image alt copy',()=>{
 expect(englishAltSource('Blue floral wallpaper | LOGESSA\n\nBlue flowers on ivory.\n\nDesign details:\nMore details')).toBe('Blue flowers on ivory.');
 expect(englishAltSource('Mavi cicekler')).toBe('');
});
