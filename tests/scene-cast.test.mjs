import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScene,actionPrompt} from '../web/scene.js';
import {castFrame,mountSceneCast} from '../web/scene-cast.js';
import {defaults,normalize} from '../web/state.js';
import {registeredArt} from '../web/character-art.js';
import {uiHarness} from './ui-harness.mjs';

const others=Object.keys(registeredArt).filter(id=>id!=='serin').slice(0,2);
const cast=[{id:'serin',outfit:'armor',emotion:'base',speaker:'세린'},...others.map((id,i)=>({id,outfit:'none',emotion:'base',speaker:'참가자 '+(i+2)}))];
const scene=()=>({schema_version:1,type:'ercedia_scene',scene_id:'cast-test',location:'현지',time:'오후',background_id:null,npc:cast[0],cast,dialogue:[{speaker:'세린',speaker_id:'serin',text:'첫 대사',emotion:'smile'},{speaker:cast[1].speaker,speaker_id:cast[1].id,text:'둘째 대사'},{speaker:'나레이션',text:'잠시 침묵한다.'}],choices:[]});
test('three registered cast members and speaker IDs roundtrip while legacy single NPC saves remain exact',()=>{
  const s=normalizeScene(scene()),state={...defaults(),scene:s,sceneIndex:1};assert.deepEqual(normalize(state).scene,s);
  const legacy=scene();delete legacy.cast;legacy.dialogue=legacy.dialogue.slice(0,1);delete legacy.dialogue[0].speaker_id;
  assert.equal(Object.hasOwn(normalizeScene(legacy),'cast'),false);
});
test('unknown, duplicate and fourth participants or nonparticipant speaker IDs are rejected',()=>{
  assert.throws(()=>normalizeScene({...scene(),cast:[...cast,cast[0]]}),/1~3/);
  assert.throws(()=>normalizeScene({...scene(),cast:[cast[0],cast[0]]}),/중복/);
  assert.throws(()=>normalizeScene({...scene(),cast:[{...cast[0],id:'missing'}]}),/인물/);
  assert.throws(()=>normalizeScene({...scene(),dialogue:[{speaker:'외부 인물',speaker_id:'missing',text:'안녕'}]}),/참가자/);
});
test('emotion changes belong to their speaker, backward navigation recomputes them and narration highlights nobody',()=>{
  const s=normalizeScene(scene());let f=castFrame(s,1);assert.equal(f[0].emotion,'smile');assert.equal(f[1].emotion,'base');assert.equal(f[1].active,true);
  f=castFrame(s,2);assert.equal(f.some(p=>p.active),false);f=castFrame(s,-1);assert.equal(f[0].emotion,'base');
});
test('cast renderer reuses three image slots and selects the clicked participant',()=>{
  const h=uiHarness();try{
    const state={...defaults(),character:true,scene:normalizeScene(scene()),sceneIndex:0};let selected;
    const ui=mountSceneCast(state,{assetBase:'https://example.test/',onSelect:id=>{selected=id;}});ui.render();
    const root=h.get('scene-cast'),nodes=root.children.map(n=>n.children[0].children[0]);assert.equal(root.children.length,3);
    root.children[1].children[1].onclick({stopPropagation(){}});assert.equal(selected,cast[1].id);
    state.sceneIndex=1;ui.render();assert.deepEqual(root.children.map(n=>n.children[0].children[0]),nodes);
    assert.equal(root.children[0].dataset.active,'false');assert.equal(root.children[1].dataset.active,'true');
    state.scene={...state.scene,cast:cast.slice(0,2)};ui.render();assert.equal(root.children[2].hidden,true);
    ui.hide();assert.equal(root.hidden,true);
  }finally{h.close();}
});
test('body load failure never leaves an independent floating Serin face',()=>{
  const h=uiHarness();try{
    const state={...defaults(),character:true,scene:normalizeScene(scene()),sceneIndex:0};const ui=mountSceneCast(state,{onSelect(){}});ui.render();
    const [body,face]=h.get('scene-cast').children[0].children[0].children;
    const classes=new Set();body.classList={add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)};
    face.onload();assert.equal(face.hidden,true);body.onload();assert.equal(face.hidden,false);
    body.onerror();assert.equal(face.hidden,true);
  }finally{h.close();}
});
test('GM requests carry current participants and explain the additive three-person scene contract',()=>{
  const state={...defaults(),scene:normalizeScene(scene())},prompt=actionPrompt(state,'대화하기','request-cast');
  assert.match(prompt,/최대 3명/);assert.match(prompt,/speaker_id/);assert.ok(prompt.includes(cast[1].id));
});
