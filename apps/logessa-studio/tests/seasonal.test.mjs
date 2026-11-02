import test from 'node:test';import assert from 'node:assert/strict';
import {seasonalPhase} from '../lib/seasonal.ts';
import {seasonalObservations,seasonalStats,nextPeak} from '../lib/seasonal-analytics.ts';
test('season planning crosses the December-January boundary and keeps preparation distinct',()=>{assert.equal(seasonalPhase([1,2,3,4],false,11,2),'prepare');assert.equal(seasonalPhase([1,2,3,4],false,12,2),'publish');assert.equal(seasonalPhase([1,2,3,4],false,1,2),'peak');assert.equal(seasonalPhase([1,2,3,4],false,10,2),'quiet');});
test('evergreen and unknown monthly plans do not fabricate peaks',()=>{for(let m=1;m<=12;m++){assert.equal(seasonalPhase([],true,m),'evergreen');assert.equal(seasonalPhase([],false,m),'quiet');}});

test('radar deduplicates by newest provider date rather than latest import and preserves zero',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z');
 const history=[{kind:'discovery',fetchedAt:'2026-11-02',data:[{keyword:'botanical wallpaper',searches:800,competition:90,change3m:.5,asOf:'2026-01-01'}]},{kind:'keywords',fetchedAt:'2026-11-01',data:[{keyword:'botanical wallpaper',volume:{etsy_monthly:0},competition:{competing_listings:0},trend:{change_3m:0},as_of:'2026-10-31'}]}];
 const rows=seasonalObservations(history,now);assert.equal(rows.length,1);assert.equal(rows[0].searches,0);assert.equal(rows[0].score,0);assert.equal(rows[0].stale,false);assert.equal(seasonalStats(rows).rising,0);
});
test('old and undated observations remain inspectable but cannot count as fresh trends',()=>{
 const rows=seasonalObservations([{kind:'seasonal',fetchedAt:'2026-11-02',data:[{keyword:'old wallpaper',searches:300,change3m:.9,asOf:'2026-01-01'},{keyword:'unknown wallpaper',searches:null,competition:null,change3m:null}]}],Date.parse('2026-11-02'));
 assert.equal(seasonalStats(rows).stale,2);assert.equal(seasonalStats(rows).fresh,0);assert.equal(seasonalStats(rows).rising,0);assert.equal(rows.find(r=>r.keyword==='unknown wallpaper').score,null);assert.equal(nextPeak([1,2,3],11),1);assert.equal(nextPeak([],11),null);
});
