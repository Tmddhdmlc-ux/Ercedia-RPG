import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {introData} from '../web/intro-data.js';
import {eligibleSkills,effectiveLoadout,equipSkill,equippedSkills,loadoutContext} from '../web/skill-loadout.js';
import {actualPlace,adventureOptions,adventureGuide,nearbyPeople,questPreview} from '../web/adventure-model.js';
import {usableSkills,awardXP,investStat} from '../web/engine-model.js';
import {contextSummary,actionPrompt,normalizeScene} from '../web/scene.js';
import {battleFixture} from './battle-fixtures.js';
import {validateBattleSettlement} from '../web/battle-model.js';
import {planNPCLife} from '../web/npc-life.js';
import {mountAdventureUI} from '../web/adventure-ui.js';
import {mountSkillLoadout} from '../web/skill-loadout-ui.js';
import {uiHarness} from './ui-harness.mjs';
const start=()=>({...defaults(),player:initialPlayer('모험가'),gameState:{region:'W3',place:'솔브린 마을',date:'1-1-1'},inventory:[]});
test('old saves retain learned records; four battle slots, passive-only dialogue and a separate ultimate',()=>{
 const s=start();s.player.skills=Array.from({length:6},(_,i)=>({id:'s'+i,name:'기술'+i,enabled:true,description:'승인 효과',formula:'',skill_type:i===4?'passive':'active',usage:i===4?'both':'battle',mp_cost:0}));s.player.skills.push({id:'ult',name:'보유 궁극기',ultimate:true,enabled:true});
 assert.equal(equippedSkills(s,'battle').length,4);assert.equal(s.player.skills.length,7);assert.deepEqual(eligibleSkills(s,'dialogue').map(s=>s.id),['s4']);assert.ok(!eligibleSkills(s,'battle').some(s=>s.id==='ult'));
 equipSkill(s,'battle','s4',2);equipSkill(s,'battle',null,0);assert.equal(effectiveLoadout(s).battle[0],null);assert.equal(effectiveLoadout(s).battle[2],'s4');assert.equal(usableSkills(s).length,2);
 const loaded=normalize(JSON.parse(JSON.stringify(s)));assert.equal(loaded.player.skills.length,7);assert.deepEqual(loaded.skill_loadout,s.skill_loadout);assert.equal(loaded.player.skills[4].skill_type,'passive');assert.equal(loaded.player.skills.at(-1).ultimate,true);
 assert.throws(()=>equipSkill(s,'dialogue','s1',0),/장착/);s.battlePlayback={done:false};assert.throws(()=>equipSkill(s,'battle','s2',0),/전투 중/);
});
test('starting passive needs a selected slot; disabled and unlearned book skills cannot be equipped',()=>{
 const s=start();s.starting_passive_id=introData.passives[0].id;s.player.skills=[{id:'no',name:'미학습',book_id:'BK-SWD-001',enabled:true},{id:'off',name:'사용 불가',enabled:false}];
 assert.equal(eligibleSkills(s,'battle').length,1);assert.equal(loadoutContext(s).dialogue.length,1);equipSkill(s,'dialogue',null,0);assert.equal(loadoutContext(s).dialogue.length,0);assert.equal(s.starting_passive_id,introData.passives[0].id);
});
test('battle rejects an unselected learned attack and a fifth skill while retaining basic attacks',()=>{
 const f=battleFixture('unique'),scene=normalizeScene(f.scene);assert.equal(validateBattleSettlement(scene,f.state),true);f.state.skill_loadout={version:1,battle:[],dialogue:[]};assert.throws(()=>validateBattleSettlement(scene,f.state),/장착 기술/);
 const plain=battleFixture();plain.state.skill_loadout={version:1,battle:[],dialogue:[]};assert.equal(validateBattleSettlement(normalizeScene(plain.scene),plain.state),true);
 delete f.state.skill_loadout;f.state.battlePlayback={scene,done:false};assert.equal(validateBattleSettlement(scene,f.state),true);
});
test('map browsing never changes actual region or reveals absent and secret NPCs',()=>{
 const s=start();s.region='E1';s.mapView='east';assert.equal(actualPlace(s).region,'W3');assert.ok(adventureOptions(s).dungeons.every(d=>d.region_id==='W3'));
 s.npc_life={npcs:{serin:{known:true,region:'W3',place:'다른 마을',activity:'순찰',quests:[],injuries:[]}},memories:[]};assert.equal(nearbyPeople(s).length,0);s.npc_life.npcs.serin.place='솔브린 마을';assert.equal(nearbyPeople(s)[0].name,'세린');s.npc_life.npcs.serin.known=false;assert.equal(nearbyPeople(s).length,0);
});
test('first path is optional, verified reporting takes priority, XP produces investable growth',()=>{
 const s=start();assert.equal(adventureGuide(s).action,'board');s.quest_log=[{id:'q',title:'테스트 의뢰',status:'active'}];assert.equal(adventureGuide(s).action,'quests');awardXP(s,100);assert.equal(s.player.level,2);assert.equal(s.player.unspentStatPoints,3);assert.equal(adventureGuide(s).action,'status');investStat(s,'constitution');assert.ok(s.player.maxHp>100);s.quest_log[0].status='ready_to_report';assert.match(adventureGuide(s).title,/보고/);
 const q={title:'운송',summary:'목표 설명',deadline_at:'1-1-4',objectives:[{current:1,target:4}],reward:{xp:10,currency:30}};const preview=questPreview(q,s);assert.equal(preview.progress,25);assert.equal(preview.days,3);assert.equal(preview.description,q.summary);
});
test('meeting and game-time changes use the existing life engine and survive reload',()=>{
 const s=start(),scene={schema_version:1,type:'ercedia_scene',scene_id:'town1',location:'솔브린 마을',time:'오후',background_id:null,npc:{id:'serin',outfit:'armor',emotion:'base',speaker:'세린'},dialogue:[{speaker:'세린',text:'안녕하세요.'}],choices:[],game_state:{...s.gameState}};
 Object.assign(s,planNPCLife(s,normalizeScene(scene)));s.scene=normalizeScene(scene);assert.equal(nearbyPeople(s)[0].name,'세린');const next={...scene,scene_id:'town2',game_state:{...scene.game_state,date:'1-1-2'}};Object.assign(s,planNPCLife(s,normalizeScene(next)));s.gameState=next.game_state;const loaded=normalize(JSON.parse(JSON.stringify(s)));assert.equal(loaded.npc_life.clock,'1-1-2');assert.equal(loaded.npc_life.memories.filter(m=>m.action==='첫 만남').length,1);
});
test('GM request contains the real adventure context and both selected skill modes',()=>{
 const s=start();const summary=contextSummary(s);assert.equal(summary.adventure.location.region,'W3');assert.equal(summary.skill_loadout.slots_per_mode,4);const prompt=actionPrompt(s,'주변 탐색','req');assert.match(prompt,/RPG_ADVENTURE_LOOP.md/);assert.match(prompt,/미장착/);assert.match(prompt,/첫 마을/);
});
const all=node=>[node,...(node.children||[]).flatMap(all)];
test('VN town buttons submit through the same chat callback without locally moving or granting rewards',()=>{
 const h=uiHarness();try{const create=document.createElement;document.createElement=(...args)=>{const n=create(...args);n.querySelector=()=>null;return n;};const menu=h.get('utility-actions'),query=document.querySelector;document.querySelector=selector=>selector==='.utility-actions'?menu:query(selector);const s=start(),before=JSON.stringify(s),sent=[];const ui=mountAdventureUI(s,{submit:v=>sent.push(v),isPending:()=>false,switchTo:()=>{}});ui.render();const open=menu.children[0];assert.equal(h.game.children.some(n=>n.className==='adventure-toolbar'),false);assert.equal(h.get('story').children.length,0);s.page='map';ui.render();assert.equal(open.hidden,false);s.page='story';ui.render();open.onclick();const panel=h.game.children.at(-1);all(panel).find(n=>n.textContent==='일자리·의뢰').onclick();all(panel).find(n=>n.textContent==='현지 일자리·게시 창구 조회').onclick();assert.equal(sent.length,1);assert.match(sent[0],/offered/);assert.equal(JSON.stringify(s),before);assert.equal(panel.hidden,true);open.onclick();all(panel).find(n=>n.textContent==='주변 인물').onclick();const cart=all(panel).find(n=>n.className==='adventure-card resident-card'&&n.children.some(c=>c.textContent.includes('토렌 바크')));const blocked=cart.children.find(n=>n.textContent==='지금은 만날 수 없음');assert.equal(blocked.disabled,true);assert.ok(cart.children.some(n=>n.textContent.includes('현재 위치가 확인되지')));blocked.onclick();assert.equal(sent.length,1);assert.equal(JSON.stringify(s),before);s.npc_life={memories:[],npcs:{'ER-COM-003':{known:true,region:'W3',place:'솔브린 마을',location_confirmed:true,activity:'수레 정비'}}};ui.render();const confirmed=all(panel).find(n=>n.className==='adventure-card resident-card'&&n.children.some(c=>c.textContent.includes('토렌 바크')));const talk=confirmed.children.find(n=>n.textContent==='만나서 대화');assert.equal(talk.disabled,false);talk.onclick();assert.equal(sent.length,2);assert.match(sent[1],/ER-COM-003/);s.npc_life.npcs['ER-COM-003'].region='E1';talk.onclick();assert.equal(sent.length,2);open.onclick();all(panel).find(n=>n.textContent==='수련').onclick();const beforeTraining=JSON.stringify(s);all(panel).find(n=>n.textContent==='기초 단련 1회 실행').onclick();assert.equal(sent.length,3);assert.match(sent[2],/engine_events xp/);assert.match(sent[2],/game_state.date\/time/);assert.equal(JSON.stringify(s),beforeTraining);}finally{h.close();}
});
test('loadout UI saves selection and blocks a second mutation while a GPT request is pending',()=>{
 const h=uiHarness();try{h.get('skill-list').before=node=>h.get('status-panel').append(node);const s=start();s.player.skills=[{id:'one',name:'기술',enabled:true,description:'효과',skill_type:'active',usage:'battle'}];let pending=false,saves=0;const ui=mountSkillLoadout(s,{persist:()=>saves++,isPending:()=>pending});ui.render();const root=h.get('status-panel').children[0],select=root.children[2].children[1].children[1];select.value='';select.onchange();assert.equal(saves,1);assert.equal(effectiveLoadout(s).battle[0],null);pending=true;select.value='one';select.onchange();assert.equal(saves,1);assert.equal(effectiveLoadout(s).battle[0],null);}finally{h.close();}
});
