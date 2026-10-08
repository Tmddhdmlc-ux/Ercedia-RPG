import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapData} from '../web/map-data.js';
import {lordships} from '../web/lordship-data.js';
import {mapSelectionInfo} from '../web/map-info.js';
test('all 13 lordships show registered names, lords and source facts',async()=>{
  const source=await readFile(new URL('../LORDSHIPS.md',import.meta.url),'utf8');
  const points=mapData.locations.filter(p=>p.kind==='lordship');assert.equal(points.length,13);
  for(const p of points){
    const info=mapSelectionInfo(p.id),facts=lordships[p.id];
    assert.equal(info.title,p.label);assert.equal(facts.lord,p.lord);assert.equal(facts.kingdom,p.kingdom);
    assert.ok(source.includes(`### ${p.id} · ${info.title}`));assert.ok(source.includes(`**생산·경제:** ${facts.economy}`));
    assert.ok(info.fields.some(([name,value])=>name==='현직 영주'&&value===p.lord));
    assert.match(info.description,/경계는 미확정/);
    assert.ok(!Object.hasOwn(facts,'ambition'));assert.ok(!Object.hasOwn(facts,'secrets'));
  }
  assert.equal(lordships.W3.population,146000);assert.equal(lordships.E2.mages,44);assert.equal(lordships.S2.standingArmy,2250);
});
test('royal capitals stay distinct from lordships and candidate sites remain unassigned',()=>{
  for(const id of ['CW','CE','CS']){const info=mapSelectionInfo(id);assert.match(info.description,/왕실 직할/);assert.match(info.title,/도시명 미정/);assert.deepEqual(info.fields,[]);}
  for(const id of ['F1','M1','P1','P2','D1','B1','A1','I1']){const info=mapSelectionInfo(id);assert.match(info.description,/소유권은 미확정/);assert.deepEqual(info.fields,[]);}
  for(const [id,name] of [['west','벨로아'],['east','드라켄'],['south','루메린']])assert.equal(mapSelectionInfo(id).title,name+' 왕국');
  assert.equal(mapSelectionInfo('unknown'),null);
});
