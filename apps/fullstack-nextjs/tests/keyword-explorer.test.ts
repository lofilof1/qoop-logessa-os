import {it,expect} from 'vitest';
import {exactLegacy,keywordClass,keywordRatio,keywordRelevant} from '../src/lib/keyword-explorer';
it('does not convert missing, bounded or ambiguous historical values into exact zero',()=>{
 for(const value of ['',null,'Unknown','<20','1,000','1.000,5']) expect(exactLegacy(value)).toBeNull();
 expect(exactLegacy('0')).toBe(0);expect(exactLegacy('1208')).toBe(1208);
});
it('ranks only comparable exact values with positive competition',()=>{
 expect(keywordRatio(675,122,true)).toBeCloseTo(5532.7869);
 expect(keywordRatio(675,122,false)).toBeNull();expect(keywordRatio(null,122,true)).toBeNull();expect(keywordRatio(675,0,true)).toBeNull();expect(keywordRatio(0,122,true)).toBe(0);
});
it('keeps materials out of motif opportunities and flags obvious irrelevant vocabulary',()=>{
 expect(keywordClass('peel and stick tile')).toBe('Malzeme / teknik');
 expect(keywordClass('sage green wallpaper')).toBe('Renk');
 expect(keywordClass('mushroom wallpaper')).toBe('Motif');
 expect(keywordClass('art deco wallpaper')).toBe('Stil / dönem');
 expect(keywordRelevant('dark souls wallpaper')).toBe(false);
});
