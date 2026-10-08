import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
import {registeredArt,npcPlacements,placedNPCs,placementFor,characterVisual,heraldry,artBase} from '../web/character-art.js';
import {defaults,normalize} from '../web/state.js';
import {npcSnapshot,updateNPC,npcContext} from '../web/npc-model.js';
import {normalizeScene} from '../web/scene.js';
import {normalizeBattle} from '../web/battle-model.js';
import {battleFixture} from './battle-fixtures.js';
import {mapData} from '../web/map-data.js';
import {mountNPCArt} from '../web/npc-art-ui.js';
import {mountBattleUI} from '../web/battle-ui.js';
import {uiHarness} from './ui-harness.mjs';

test('all 138 portraits, 118 human standings and 24 unique symbols exist and are staged assets',()=>{
  const assets=JSON.parse(readFileSync('integration/assets.json')),paths=[];
  assert.equal(Object.keys(registeredArt).length,138);assert.equal(Object.values(registeredArt).filter(p=>p.standing).length,118);
  for(const a of Object.values(registeredArt)){paths.push(a.portrait,...(a.standing?[a.standing]:[]));assert.deepEqual(a.expressions,['base']);}
  const symbols=new Set(Object.values(heraldry).flatMap(group=>Object.values(group)));assert.equal(symbols.size,24);paths.push(...symbols);
  assert.equal(new Set(paths).size,280);for(const p of paths){assert.ok(existsSync(p));assert.ok(assets.includes(p));}
});
test('139 placements keep source parent regions and public faction or regional anchors, without new geography',()=>{
  assert.equal(npcPlacements.length,139);assert.equal(new Set(npcPlacements.map(p=>p.id)).size,139);
  const source=[...JSON.parse(readFileSync('characters/npc_roster_100.json')).characters,...JSON.parse(readFileSync('characters/core_cast_stats_38.json')).roster,JSON.parse(readFileSync('characters/serin.json'))];
  const factions=JSON.parse(readFileSync('assets/maps/world/faction_locations.json')).locations;
  for(const p of source){const place=placementFor(p.id),anchor=mapData.locations.find(a=>a.id===p.location_id);assert.equal(place.location_id,p.location_id);assert.equal(place.region,anchor.region);const point=place.faction_id?factions.find(f=>f.id===place.faction_id):anchor;assert.equal(place.x,point.x);assert.equal(place.y,point.y);assert.equal(place.exact_position,false);}
  assert.equal(placementFor('ER-CORE-001').location_id,'CW');assert.equal(placementFor('ER-CORE-017').faction_id,'SHTH');assert.equal(placementFor('serin').location_id,'W3');
});
test('every new NPC scene resolves its own registered image and rejects missing outfits or expressions',()=>{
  for(const id of Object.keys(registeredArt)){const raw={schema_version:1,type:'ercedia_scene',scene_id:id,location:'거점',time:'오후',background_id:null,npc:{id,outfit:'none',emotion:'base',speaker:id},dialogue:[{speaker:id,text:'검증'}],choices:[]};assert.equal(normalizeScene(raw).npc.id,id);assert.ok(characterVisual(id,'none','base').path.includes(id));raw.npc.emotion='love';assert.throws(()=>normalizeScene(raw));}
  assert.equal(characterVisual('missing','none'),null);assert.equal(characterVisual('ER-NPC-081').kind,'monster');
});
test('a confirmed location update survives v1 saves, changes regional lists and GM context, and refuses unknown IDs',()=>{
  const state=defaults();assert.ok(placedNPCs('CW',null,state).some(p=>p.id==='ER-NPC-001'));
  updateNPC(state,'ER-NPC-001',{location_id:'E4'});const saved=normalize(state);
  assert.equal(npcSnapshot(saved,'ER-NPC-001').location_id,'E4');assert.equal(npcSnapshot(saved,'ER-NPC-001').placement.location_id,'E4');
  assert.ok(!placedNPCs('CW',null,saved).some(p=>p.id==='ER-NPC-001'));assert.ok(placedNPCs('E4',null,saved).some(p=>p.id==='ER-NPC-001'));
  saved.scene={npc:{id:'ER-NPC-001'},dialogue:[]};assert.ok(npcContext(saved).nearby_npcs.some(p=>p.id==='ER-NPC-001'));
  assert.throws(()=>updateNPC(saved,'ER-NPC-001',{location_id:'invented_city'}));assert.deepEqual(normalize(defaults()),defaults());
});
test('battle loads a registered monster portrait automatically and refuses another person or player art',()=>{
  const f=battleFixture('dungeon'),npc=npcSnapshot(f.state,'ER-NPC-100'),enemy={...npc,side:'enemy',level_hp_bonus:npc.levelHpBonus,skills:[],modifiers:{},art:null};
  const b={...f.scene.battle,participants:[f.scene.battle.participants[0],enemy],events:[{id:'m1',actor:enemy.id,target:'player',kind:'attack',result:'hit',skill_id:null,damage:100,mp_cost:0,actor_hp_after:enemy.hp,actor_mp_after:enemy.mp,target_hp_after:0,target_mp_after:100,narration:'검증',calculation:{base_roll:10,realm_multiplier:1,context_multiplier:1,defense:0}}],initiative:{actor_id:enemy.id,reason:''},outcome:{winner:'enemy',termination:'defeat',reason:'검증',xp_gain:0,items_added:[],items_consumed:[],injuries:[],resources:[{id:'player',hp:0,mp:100},{id:enemy.id,hp:enemy.hp,mp:enemy.mp}]}};
  const result=normalizeBattle(b);assert.deepEqual(result.participants[1].art,{id:'ER-NPC-100',outfit:'none',emotion:'base'});
  enemy.art={id:'ER-NPC-001',outfit:'none',emotion:'base'};assert.throws(()=>normalizeBattle(b),/원화/);
  enemy.art=null;b.participants[0].art={id:'ER-NPC-001',outfit:'none',emotion:'base'};assert.throws(()=>normalizeBattle(b),/원화/);
});
test('dialogue image controller lazily loads the chosen person and handles missing image without Serin substitution',()=>{
  const h=uiHarness();try{const ui=mountNPCArt({assetBase:'/',status:h.get('expression-status')});ui.render({id:'ER-NPC-001',outfit:'none',emotion:'base',speaker:'알윈'},true);assert.equal(ui.image.src,'/assets/characters/standings/ER-NPC-001/base.png');ui.image.onerror();assert.match(h.get('expression-status').textContent,/로드 실패/);ui.render({id:'ER-NPC-081',outfit:'none',emotion:'base',speaker:'늑대'},true);assert.equal(ui.image.src,'/assets/characters/monsters/portraits/ER-NPC-081.png');ui.hide();assert.equal(ui.image.hidden,true);assert.ok(artBase().includes('@ab565b9'));}finally{h.close();}
});
test('battle renderer uses each human standing or monster portrait with no Serin face layer',()=>{
  for(const id of ['ER-NPC-001','ER-NPC-100']){
    const h=uiHarness();try{
      const {state,scene}=battleFixture('dungeon');
      const enemy=scene.battle.participants[1];enemy.id=id;enemy.art={id,outfit:'none',emotion:'base'};
      for(const e of scene.battle.events){if(e.actor==='demo_enemy')e.actor=id;if(e.target==='demo_enemy')e.target=id;}
      state.battlePlayback={scene,index:0,speed:1,paused:false,done:false,replay:false,manual:true};
      const ui=mountBattleUI(state,{render(){},persist(){},chat:{isPending:()=>false,controls(){}},assetBase:'/'});ui.render();
      const [body,face]=h.get('battle-right').children[0].children;
      assert.equal(body.src,'/'+characterVisual(id).path);assert.equal(face.hidden,true);assert.equal(face.src,undefined);
      body.onerror();assert.equal(h.get('battle-right').children[1].hidden,false);
    }finally{h.close();}
  }
});
test('staged launcher health ignores absent and deferred thumbnails but still waits for visible registered assets',async()=>{
  const source=readFileSync('integration/game-entry.js','utf8').replace(/import '[^']+';/,'');let payload;
  const img={loading:'eager',dataset:{},complete:true,naturalWidth:100,src:'/registered.png',getAttribute(){return this.src;}};
  const empty={loading:'eager',getAttribute(){return null;}},lazy={loading:'lazy',getAttribute(){return '/deferred.png';}};
  new Script(source).runInNewContext({window:{__ERCEDIA_CONFIG__:{token:'test',conversation:'test'}},document:{images:[empty,lazy,img]},parent:{postMessage(p){payload=p;}},setTimeout});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(payload.payload.ok,true);assert.deepEqual([...payload.payload.failedAssets],[]);
});
