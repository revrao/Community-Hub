import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validLocation} from '../src/lib/event-location.ts';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
test('manual event pins require valid coordinates',()=>{
 assert.equal(validLocation(null),false);
 assert.equal(validLocation({latitude:NaN,longitude:0}),false);
 assert.equal(validLocation({latitude:91,longitude:0}),false);
 assert.equal(validLocation({latitude:0,longitude:181}),false);
 assert.equal(validLocation({latitude:0,longitude:0}),true);
 assert.equal(validLocation({latitude:37.779029,longitude:-122.418848}),true);
});
test('application and service checks cannot call Mapbox search services',async()=>{
 async function files(dir:string):Promise<string[]>{const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(dir,e.name)):Promise.resolve([join(dir,e.name)])))).flat();}
 const paths=[...await files('src'),...await files('scripts')];
 for(const path of paths){const source=await readFile(path,'utf8');assert.doesNotMatch(source,/search\/geocode|geocoding\/v[56]|search\/searchbox|search\/autofill|permanent["']?\s*[,=:]\s*["']?true/i,path);}
 const picker=await readFile('src/components/event-location-picker.tsx','utf8');assert.doesNotMatch(picker,/\bfetch\s*\(|\bgeocode\s*\(/);
});
