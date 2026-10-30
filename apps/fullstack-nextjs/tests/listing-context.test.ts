import {it,expect} from 'vitest';import {listingContext} from '../src/lib/listing-context';
it('prefills only registered brief values without inventing an image reading',()=>{expect(listingContext({raw:{brief:{mode:'pattern',values:{primary:'__other__',medium:'Vector',palette:'Sage'},custom:{primary:'Olive branches'}}}})).toEqual({subject:'Olive branches',color:'Sage',style:'Vector',product:'wallpaper'});});
it('keeps unrecorded content blank for confirmation',()=>{expect(listingContext({raw:{sourceMode:'mural'}})).toEqual({subject:'',color:'',style:'',product:'wall mural'});});

it("does not silently label an unknown or motif-only design as a mural",()=>{expect(listingContext({raw:{sourceMode:"auto"}}).product).toBe("");expect(listingContext({raw:{sourceMode:"pattern"}}).product).toBe("wallpaper");});
