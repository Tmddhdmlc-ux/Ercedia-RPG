import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {uiHarness} from './ui-harness.mjs';
import {defaults,normalize} from '../web/state.js';
import {normalizeIntroDraft} from '../web/intro-model.js';
import {mountNewGame} from '../web/new-game.js';
import {automaticStartLordship} from '../web/start-regions.js';
import {mountQuestUI,questPreviewText} from '../web/quest-ui.js';
import {normalizeQuest} from '../web/quest-model.js';
test('three kingdom buttons explain each region, automatically assign an approved origin and preserve resumed origins',()=>{
  const h=uiHarness();document.querySelectorAll=()=>[];
  try{
    const state={...defaults(),introDraft:normalizeIntroDraft({step:'kingdom',name:'여행자',answers:{calling:'guard',response:'protect'},passive:'steadfast'})};
    const ui=mountNewGame(state,{embedded:false,render(){ui.render();},persist(){},chat:{controls(){},isPending:()=>false}});ui.render();
    assert.equal(h.get('intro-kingdom-options').children.length,3);assert.equal(h.get('intro-map-cancel').hidden,true);
    for(const [index,id,origin] of [[0,'west','W1'],[1,'east','E1'],[2,'south','S1']]){
      h.get('intro-kingdom-options').children[index].onclick();
      assert.equal(state.introDraft.kingdom,id);assert.equal(state.introDraft.lordship,origin);assert.equal(state.introDraft.step,'confirmation');
      assert.match(h.get('intro-map-title').textContent,/시작하시겠습니까/);
      assert.ok(h.get('intro-map-summary').children.some(p=>p.textContent.includes('보너스는 없습니다')));
      assert.equal(normalize(state).introDraft.lordship,origin);
    }
    state.introDraft.lordship='S4';ui.render();assert.equal(state.introDraft.lordship,'S4');
    state.player.name='기존 인물';ui.render();assert.equal(h.get('intro-map-cancel').hidden,false);
    assert.equal(automaticStartLordship('east','W3'),'E1');assert.equal(automaticStartLordship('west','W3'),'W3');
  }finally{h.close();}
});
test('quest hover and keyboard focus show the offered description and rewards without accepting or changing the quest',()=>{
  const h=uiHarness();document.querySelectorAll=()=>[];
  try{
    const q=normalizeQuest({id:'hover-quest',title:'길목 조사',summary:'실제 길목의 흔적을 조사한다.',origin:'guild_board',type:'investigate',region_id:'W1',status:'offered',rank:'F',objectives:[{id:'clue',description:'단서 확인',target:1,verification:{kind:'clue',target_id:'clue-1'}}],reward:{xp:25,currency:80,item_ids:[],materials:[],affection_effects:[]}});
    const state={...defaults(),quest_log:[q],gameState:{region:'W1'}};let sent=0;
    const ui=mountQuestUI(state,{chat:{isPending:()=>false,submit(){sent++;}},switchTo(){},persist(){},showMap(){}});
    // The active list displays the same preview mechanism as offered cards.
    q.status='active';ui.render();const card=h.get('quest-list').children[0];card.getBoundingClientRect=()=>({right:400,top:150});
    const before=structuredClone(state);card.onpointerenter();assert.equal(h.get('quest-preview').hidden,false);
    assert.match(h.get('quest-preview').textContent,/실제 길목/);assert.match(h.get('quest-preview').textContent,/EXP 25 · 재화 80/);
    card.onpointerleave();assert.equal(h.get('quest-preview').hidden,true);card.onfocus();assert.equal(h.get('quest-preview').hidden,false);
    assert.deepEqual(state,before);assert.equal(sent,0);assert.ok(questPreviewText(q).includes('단서 확인'));
  }finally{h.close();}
});
test('confirming the kingdom saves the automatic lordship and creates its registered first scene without retaining an old protagonist',async()=>{
  const h=uiHarness();document.querySelectorAll=()=>[];
  try{
    const state={...defaults(),introDraft:normalizeIntroDraft({step:'kingdom',name:'새 여행자',answers:{calling:'guard',response:'protect'},passive:'steadfast'})};state.player.name='이전 인물';state.player.hp=32;
    const ui=mountNewGame(state,{embedded:false,render(){ui.render();},persist(){},chat:{controls(){},isPending:()=>false,setCampaignSettings(){},apply(source){state.scene=JSON.parse(source);}}});
    ui.setSettings({sha:'a'.repeat(40),paths:[],files:{}});ui.render();h.get('intro-kingdom-options').children[1].onclick();await h.get('intro-map-next').onclick();
    assert.equal(state.starting_lordship_id,'E1');assert.equal(state.starting_kingdom,'드라켄');assert.equal(state.player.name,'새 여행자');assert.equal(state.player.hp,100);assert.equal(state.player.mp,100);assert.equal(state.player.level,1);
    assert.equal(state.introDraft,undefined);assert.equal(state.scene.background_id,'IMG-E1-HUB');assert.equal(state.scene.npc,null);assert.equal(state.previousGame.player.name,'이전 인물');
  }finally{h.close();}
});
test('choices and quest proposals belong to the VN stage with unique IDs and a location-neutral composer',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const stage=html.indexOf('id="stage"'),controls=html.indexOf('class="story-controls"');
  for(const id of ['scene-action-overlay','scene-choices','quest-proposals']){const at=html.indexOf(`id="${id}"`);assert.ok(at>stage&&at<controls);assert.equal(html.split(`id="${id}"`).length,2);}
  assert.ok(!html.includes('placeholder="세린에게'));
});
