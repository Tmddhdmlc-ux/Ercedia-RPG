import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseScene,normalizeScene,emotions,actionPrompt} from '../web/scene.js';
import {defaults,normalize} from '../web/state.js';
const example=JSON.parse(await readFile(new URL('../tampermonkey/example-scene.json',import.meta.url),'utf8'));
test('scene parses raw and fenced JSON while refusing unknown assets and malformed streams',()=>{
  const scene=normalizeScene(example);
  assert.deepEqual(parseScene(JSON.stringify(example)),scene);
  assert.deepEqual(parseScene('説明\n```json\n'+JSON.stringify(example)+'\n```'),scene);
  for(const raw of [{...example,npc:{...example.npc,id:'unknown'}},{...example,background_id:'https://invalid'},{...example,choices:[{id:'x',text:'a'}]},{...example,dialogue:[]},{...example,choices:[{id:'x',text:'a'},{id:'x',text:'b'}]}])assert.throws(()=>normalizeScene(raw));
  assert.throws(()=>parseScene('{"type":"ercedia_scene"'));
});
test('scene saves all expressions, dynamic dialogue position, game state and bounded duplicate IDs',()=>{
  for(const emotion of emotions){const state=defaults();state.scene=normalizeScene({...example,npc:{...example.npc,emotion}});state.sceneIndex=1;state.seenScenes=[example.scene_id];state.gameState={quests:['확인용'],events:['연결 테스트']};assert.deepEqual(normalize(JSON.parse(JSON.stringify(state))),state);}
  const state=normalize({...defaults(),scene:example,sceneIndex:999,seenScenes:Array(200).fill('a')});assert.equal(state.sceneIndex,1);assert.equal(state.seenScenes.length,100);
});
test('actions carry current player and inventory, preserve free text and do not bundle hidden lore',()=>{
  const state=defaults(),action='세린에게 묻고 돌아간다.';const request=actionPrompt(state,action,'request-1');
  assert.ok(request.endsWith(action));assert.ok(request.includes('request-1'));assert.ok(request.includes('"inventory":[]'));assert.ok(!request.includes('11봉인석'));assert.ok(!request.includes('인간을 창조'));
});
