import {it,expect} from 'vitest';
import {chooseLocalTags} from '../src/lib/local-listing-tags';
it('uses wallpaper once and rejects reordered and plural duplicates while adding new search vocabulary',()=>{
 const pool=['teal wallpaper','gold wallpaper','fan pattern','pattern fans','art deco','deco art','mint and blush','scalloped arches','watercolor texture','bedroom accent','powder room decor','geometric rhythm','gold linework','emerald tones','statement wall','interior design'];
 const tags=chooseLocalTags(pool.slice(0,6),pool);
 expect(tags).toHaveLength(13);
 expect(tags.filter(t=>t.includes('wallpaper'))).toHaveLength(1);
 expect(tags.includes('fan pattern') && tags.includes('pattern fans')).toBe(false);
 expect(tags.includes('art deco') && tags.includes('deco art')).toBe(false);
 expect(tags).toContain('watercolor texture');
});
it('does not pad an insufficient pool with invented terms',()=>{
 expect(()=>chooseLocalTags([],['teal wallpaper','gold wallpaper'])).toThrow(/13/);
});
import {englishVisualPhrase,localTagPool} from '../src/lib/local-listing-tags';
it('normalizes Turkish visual vocabulary before constructing English tags',()=>{
 expect(englishVisualPhrase('Koyu mavi')).toBe('deep blue');
 const pool=localTagPool({subject:'Tropikal',motifs:['Monstera yaprakları'],colors:['Kırmızı','Turuncu','Yeşil','Koyu mavi'],styles:['yapay sanat'],rooms:['mutfak','banyo','ofis'],searchTerms:['koyu mavi arka plan'],product:'wallpaper'} as any,[]);
 expect(pool).toContain('orange tones');expect(pool).toContain('kitchen accent');
 expect(pool.some(s=>/turuncu|mutfak|yapay|koyu|mavi|banyo|ofis/.test(s))).toBe(false);
});
