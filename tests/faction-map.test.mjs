import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {factionLocations} from '../web/faction-data.js';
import {visibleFactions,factionInfo,factionTypes} from '../web/faction-map.js';
import {mapData} from '../web/map-data.js';
import {defaults,normalize} from '../web/state.js';
test('37 public sites retain registered coordinates and anchors without confidential fields',async()=>{
  const source=JSON.parse(await readFile(new URL('../assets/maps/world/faction_locations.json',import.meta.url)));
  assert.equal(factionLocations.length,37);assert.equal(new Set(factionLocations.map(p=>p.id)).size,37);
  for(const p of factionLocations){
    const original=source.locations.find(x=>x.id===p.id);assert.equal(original.visibility,'public');
    for(const key of Object.keys(p))assert.deepEqual(p[key],original[key]);
    const anchor=mapData.locations.find(x=>x.id===p.anchor_id);assert.equal(anchor.region,p.region);
    assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);assert.ok(factionTypes[p.type]);
    assert.deepEqual(Object.keys(p),['id','type','name','region','anchor_id','x','y','leader','group','detail']);
  }
  assert.ok(!JSON.stringify(factionLocations).includes('칠대마왕'));
});
test('world view is uncluttered and kingdom or estate filters do not lose sites',()=>{
  assert.deepEqual(visibleFactions('world','world'),[]);
  const all=['west','east','south'].flatMap(id=>visibleFactions(id,id));assert.equal(all.length,37);
  for(const p of factionLocations)assert.ok(visibleFactions(p.region,p.anchor_id).some(v=>v.id===p.id));
  assert.ok(visibleFactions('west','W2').length>1);
});
test('public detail handles unknown representatives and mobile camp without implying live presence',()=>{
  assert.ok(factionInfo('KN01').fields.some(([k,v])=>k==='대표 인물'&&v==='로데릭 바란'));
  assert.ok(factionInfo('GD02').fields.some(([k,v])=>k==='대표 인물'&&v==='미정'));
  assert.match(factionInfo('MC01').description,/이동|변동/);assert.match(factionInfo('MC01').note,/실시간 위치/);
  assert.equal(factionInfo('secret'),null);
});
test('v1 saved games preserve selected faction while older or inconsistent selections stay safe',()=>{
  for(const p of factionLocations){const s=defaults();Object.assign(s,{region:p.anchor_id,mapView:p.region,mapFaction:p.id,page:'map'});assert.equal(normalize(JSON.parse(JSON.stringify(s))).mapFaction,p.id);}
  assert.equal(normalize({...defaults(),mapFaction:'KN01'}).mapFaction,null);
  const old=defaults();delete old.mapFaction;assert.equal(normalize(old).mapFaction,null);assert.equal(normalize(old).version,1);
});
