import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relationshipGraph} from '../web/relationship-data.js';
import {relationshipContext,publicRelations} from '../web/relationship-model.js';
import {npcCatalog} from '../web/npc-model.js';
import {contextSummary,actionPrompt} from '../web/scene.js';
import {isCampaignSetting} from '../web/campaign-settings.js';
import {mountNPCLifeUI} from '../web/npc-life-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {economyState} from './economy-fixtures.js';
const gm=JSON.parse(readFileSync(new URL('../characters/relationship_graph_gm.json',import.meta.url),'utf8'));
test('all established humans have valid initial relationships, while existing NPCs and stats are preserved',()=>{
 const ids=new Set(gm.entities.map(p=>p.id));assert.equal(ids.size,gm.entities.length);assert.equal(new Set(gm.edges.map(e=>e.id)).size,gm.edges.length);
 for(const e of gm.edges){assert.ok(ids.has(e.from)&&ids.has(e.to));assert.notEqual(e.from,e.to);assert.ok(e.from_view&&e.to_view&&e.conflict_trigger&&e.story_hook);}
 for(const p of npcCatalog.filter(p=>p.role!=='monster')){const entry=gm.entities.find(e=>e.id===p.id);assert.ok(entry);if(!entry.concealed)assert.equal(entry.name,p.name);assert.ok(gm.edges.some(e=>e.from===p.id||e.to===p.id),p.id);}
 assert.equal(gm.entities.filter(e=>e.id.startsWith('REL-HEIR-')).length,3);assert.ok(gm.entities.filter(e=>e.id.startsWith('REL-HEIR-')).every(e=>e.npc_id===null&&e.age>=18));assert.equal(npcCatalog.length,163);
});
test('GM motives, private contacts and concealed civilian identities never enter the public graph',()=>{
 assert.ok(gm.edges.some(e=>e.visibility==='discovered'));assert.ok(gm.edges.some(e=>e.visibility==='acquaintance'));
 for(const e of relationshipGraph.edges){assert.equal(gm.edges.find(p=>p.id===e.id).visibility,'public');assert.deepEqual(Object.keys(e).sort(),['from','id','public_description','relation','section','to']);}
 assert.ok(!relationshipGraph.entities.some(e=>['ER-COM-015','ER-COM-024'].includes(e.id)));assert.ok(!JSON.stringify(relationshipGraph).includes('from_view'));
 for(const e of relationshipGraph.edges)assert.ok(relationshipGraph.entities.some(p=>p.id===e.from)&&relationshipGraph.entities.some(p=>p.id===e.to));
});
test('current scene context is focused and actual links retain direction without new numeric axes',()=>{
 const s=economyState();s.relationships={'ER-NPC-001':{affection:12}};s.scene={npc:{id:'ER-NPC-001'},dialogue:[]};s.npc_life={npcs:{},memories:[],rumors:[],traces:[],links:[{event_id:'current',from_npc:'ER-NPC-001',to_npc:'ER-CORE-028',relation:'보고를 두고 갈등',player_known:false}]};
 const c=relationshipContext(s);assert.ok(c.baseline.some(e=>e.from==='ER-CORE-028'&&e.to==='ER-NPC-001'));assert.equal(c.actual_links[0].from_npc,'ER-NPC-001');assert.ok(c.baseline.length<=60);assert.ok(c.baseline.length<relationshipGraph.edges.length);
 assert.equal(contextSummary(s).relationship_network.actual_links[0].relation,'보고를 두고 갈등');assert.ok(actionPrompt(s,'대화','request').includes('[인물·세력 관계]'));assert.deepEqual(s.relationships,{'ER-NPC-001':{affection:12}});
});
test('public relationship facts respect known NPCs, witnessed changes and hidden later updates',()=>{
 const s=economyState();s.scene={npc:{id:'ER-CORE-028'},dialogue:[]};s.npc_life={npcs:{'ER-CORE-028':{known:true},'ER-NPC-001':{known:true}},links:[]};
 assert.ok(publicRelations(s,'ER-CORE-028').some(e=>e.to==='ER-NPC-001'));assert.ok(!publicRelations(s,'ER-CORE-028').some(e=>e.to==='ER-NPC-002'));
 s.npc_life.links.push({event_id:'known-change',from_npc:'ER-CORE-028',to_npc:'ER-NPC-001',relation:'공동 책임을 인정',reason:'실제 보고',player_known:true});
 const known=publicRelations(s,'ER-CORE-028');assert.equal(known.filter(e=>e.from==='ER-CORE-028'&&e.to==='ER-NPC-001').length,1);assert.ok(known.some(e=>e.id==='known-change'));
 s.npc_life.links.push({event_id:'hidden-change',from_npc:'ER-CORE-028',to_npc:'ER-NPC-001',relation:'비공개 불신',reason:'아직 전달되지 않음',player_known:false});assert.deepEqual(publicRelations(s,'ER-CORE-028'),known);
 assert.ok(publicRelations({...s,scene:{npc:{id:'ER-CORE-001'}}},'ER-CORE-001').some(e=>e.to==='REL-HEIR-W'));
});
test('known relations render as text without state mutation or showing hidden relationships',()=>{
 const h=uiHarness(),s=economyState();s.scene={npc:{id:'ER-CORE-001'},dialogue:[]};const before=JSON.stringify(s);try{
 const ui=mountNPCLifeUI(s,{submit(){},isPending(){return false;}});ui.render();const walk=n=>[n,...n.children.flatMap(walk)],text=walk(h.get('npc-info-card')).map(n=>n.textContent).join('\n');assert.ok(text.includes('알려진 관계'));assert.ok(text.includes('루시엔'));assert.ok(!text.includes('계승 논쟁 앞에서 약점'));assert.equal(JSON.stringify(s),before);
 }finally{h.close();}
});
test('all relationship sources are included in full GM setting synchronization',()=>{
 for(const path of ['CHARACTER_RELATIONSHIPS.md','CHARACTER_RELATIONSHIPS_GM.md','characters/relationship_graph_gm.json','characters/relationship_graph_public.json'])assert.equal(isCampaignSetting(path),true);
});
