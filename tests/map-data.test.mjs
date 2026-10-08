import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapData} from '../web/map-data.js';
import {defaults,normalize} from '../web/state.js';
test('map click overlay uses the registered coordinates without changing geography',async()=>{
  const source=JSON.parse(await readFile(new URL('../assets/maps/world/map_locations.json',import.meta.url),'utf8'));
  assert.deepEqual(mapData,{regions:source.regions,locations:source.locations});
  const points=[...mapData.regions,...mapData.locations];
  assert.equal(new Set(points.map(p=>p.id)).size,points.length);
  for(const p of points){assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);assert.equal(p.provisional,true);}
  assert.equal(source.canonical,false);
  const png=await readFile(new URL('../assets/maps/world/world_main.png',import.meta.url));
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],source.image_size);
});
test('every map point selection survives saved settings restoration',()=>{
  for(const p of [...mapData.regions,...mapData.locations]){
    const state=defaults();state.region=p.id;state.page='map';
    assert.equal(normalize(JSON.parse(JSON.stringify(state))).region,p.id);
  }
  const legacy=defaults();legacy.region='village';assert.equal(normalize(legacy).region,'village');
});
