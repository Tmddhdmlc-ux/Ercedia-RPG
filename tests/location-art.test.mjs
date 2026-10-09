import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {locationArt,backgroundArt,backgroundURL,resolveBackground,backgroundContext,mountBackground,regionBackground} from '../web/location-art.js';
import {normalizeScene,actionPrompt} from '../web/scene.js';
import {normalize,defaults} from '../web/state.js';
import {uiHarness} from './ui-harness.mjs';
import {appendItemIcon,resolveItemArt} from '../web/item-art-ui.js';
import {itemCatalog} from '../web/item-catalog.js';
import {mountBattleUI} from '../web/battle-ui.js';
import {battleFixture} from './battle-fixtures.js';
import {mountWorldUI} from '../web/world-ui.js';
import {createGameBridge} from '../integration/game-bridge.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const scene=id=>({schema_version:1,type:'ercedia_scene',scene_id:'image-test',location:'알 수 없는 장소',time:'오후',background_id:id,npc:null,dialogue:[{speaker:'나레이션',text:'장면 검증'}],choices:[]});

test('all 671 final slots have checksum-matching engine registrations and update assets',async()=>{
  const plan=await read('assets/art-production/asset_plan.json'),staged=new Set(await read('integration/assets.json'));
  assert.equal(locationArt.length,262);assert.equal(itemCatalog.length,410);
  for(const row of plan.assets){
    const entry=row.group==='locations'?locationArt.find(a=>a.id===row.id):itemCatalog.find(a=>a.id===row.id);
    assert.equal(entry?.path||entry?.icon_path,row.path,row.id);assert.ok(staged.has(row.path),row.id);
    const bytes=await readFile(new URL('../'+row.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.file_checks.sha256,row.id);
    if(row.id!=='IMG-SHARED-11'&&row.group==='locations'){assert.equal(normalizeScene(scene(row.id)).background_id,row.id);assert.equal(normalize({...defaults(),scene:scene(row.id)}).scene.background_id,row.id);}
  }
  assert.throws(()=>normalizeScene(scene('IMG-SHARED-11')),/배경/);
  for(const id of ['../x','https://example.com/x.png','IMG-NOT-CANON'])assert.throws(()=>normalizeScene(scene(id)),/배경/);
  assert.equal(normalizeScene(scene('sunny_village_day')).background_id,'sunny_village_day');assert.equal(normalizeScene(scene(null)).background_id,null);
});
test('confirmed locations and actual dungeon zone resolve without following map selection',()=>{
  const state=defaults();state.region='S1';state.gameState={region:'W1',place:'미등록 장면'};
  assert.equal(resolveBackground(scene(null),state),null);
  for(const art of locationArt.filter(a=>a.category==='facility_interior'))assert.equal(resolveBackground({...scene(null),location:art.facility_id},state),art.id);
  for(const art of locationArt.filter(a=>a.category==='faction_location'))assert.equal(resolveBackground({...scene(null),location:art.faction_id},state),art.id);
  state.world_engine={active_dungeon:'DUN-W1-01',dungeons:{'DUN-W1-01':{zone_id:'DUN-W1-01-Z02'}}};
  assert.equal(resolveBackground({...scene(null),location:'DUN-W1-01'},state),'IMG-DUN-W1-01-Z02');
  assert.equal(resolveBackground({...scene(null),location:'FAC-W1-01'},state),'IMG-FAC-W1-01-INTERIOR');
  assert.equal(resolveBackground({...scene(null),location:'W1'},state),null);
  assert.equal(regionBackground('W1'),'IMG-W1-HUB');assert.equal(regionBackground('F1'),null);
  const hidden=locationArt.find(a=>a.optional);assert.ok(hidden);
  assert.ok(!backgroundContext(state).available.some(a=>a.id===hidden.id));assert.equal(resolveBackground(scene(hidden.id),state),null);
  state.world_engine={active_dungeon:hidden.dungeon_id,dungeons:{[hidden.dungeon_id]:{zone_id:hidden.zone_id}}};state.gameState.region=hidden.region_id;
  assert.equal(resolveBackground(scene(hidden.id),state),hidden.id);assert.ok(backgroundContext(state).available.some(a=>a.id===hidden.id));
  const prompt=actionPrompt(state,'조사','request-test');assert.ok(prompt.includes('background_registry.available'));assert.ok(prompt.includes(hidden.id));
});
test('bridge v1 exposes all location registrations without handing out assets or changing state',()=>{
  const state=defaults(),before=JSON.stringify(state),bridge=createGameBridge(state,{apply(){},restore(){},render(){},persist(){}});
  assert.equal(bridge.version,1);assert.equal(bridge.getBackgroundCatalog().length,261);
  const art=bridge.getBackground('IMG-FACTION-KN01');art.path='changed';assert.notEqual(bridge.getBackground(art.id).path,'changed');assert.equal(bridge.getBackground('not-registered'),null);assert.equal(JSON.stringify(state),before);
});
test('background node loads lazily, clears missing scenes, preserves whole new art and reports failures',()=>{
  const h=uiHarness();try{
    const image=h.get('background'),status=h.get('status'),ui=mountBackground({image,status,assetBase:'/'});
    assert.equal(image.src,undefined);ui.render('IMG-SHARED-01');assert.equal(image.src,'/assets/backgrounds/shared/01.png');assert.equal(image.dataset.artFit,'contain');image.load();assert.equal(image.dataset.status,'ready');
    ui.render('sunny_village_day');assert.equal(image.dataset.artFit,'cover');ui.render(null);assert.equal(image.hidden,true);assert.equal(image.getAttribute('src'),null);
    ui.render('IMG-SHARED-02');image.error();assert.equal(image.hidden,true);assert.match(status.textContent,/로드 실패/);
    assert.match(backgroundURL('IMG-SHARED-11'),/@149bdf6155dcabf3474271144fd139d129c5e3c5\//);
  }finally{h.close();}
});
test('all registered item icons use canonical identity and rarity, preserving ungraded materials',()=>{
  const h=uiHarness();try{
    for(const item of itemCatalog){const root=h.get(item.id),frame=appendItemIcon(root,item,'/');assert.ok(frame);assert.equal(frame.children[0].src,'/'+item.icon_path);assert.equal(frame.dataset.rarity,item.rarity||undefined);}
    assert.equal(resolveItemArt({id:'unknown',name:'발명된 물품'}),null);assert.equal(appendItemIcon(h.get('unknown'),{id:'unknown'},'/'),null);
    const item=itemCatalog[0];assert.equal(resolveItemArt({name:item.name}).id,item.id);
  }finally{h.close();}
});
test('battle overlay and completed loot art never award or reveal loot early and later scenes clear results',()=>{
  const h=uiHarness(),f=battleFixture();let ui;const backgrounds=[];
  try{ui=mountBattleUI(f.state,{render:()=>ui.render(),persist(){},chat:{controls(){},isPending(){return false;},apply(){f.state.scene=f.scene;ui.render();}},assetBase:'/',renderBackground:id=>backgrounds.push(id)});
    ui.start(f.scene);assert.equal(h.get('battle-result').hidden,true);assert.equal(backgrounds.at(-1),f.scene.background_id);
    const item=itemCatalog[0];f.scene.battle.outcome.items_added=[{name:item.name,quantity:1}];
    h.get('battle-skip').onclick();assert.equal(h.get('battle-result').hidden,false);assert.equal(backgrounds.at(-1),'IMG-SHARED-12');assert.equal(h.get('battle-result').children[1].children[0].children[0].src,'/'+item.icon_path);
    f.state.scene={...f.scene,scene_id:'next-scene'};ui.render();assert.equal(h.get('battle-result').hidden,true);
  }finally{h.close();}
});
test('shop and auction display the same canonical icons without changing quotes, money or inventory',()=>{
  const h=uiHarness(),state=defaults(),book=itemCatalog.find(i=>i.rarity==='에픽'&&i.skill_id),sword=itemCatalog[0];
  state.gameState={region:'W1'};state.currency=1000;
  state.world_engine={offers:{quote:{region_id:'W1',venue_name:'검수 상점',id:'quote',valid_until:'미정',items:[{id:sword.id,stock:2,buy_price:100,sell_price:50}]}},auctions:{sale:{region_id:'W1',item_id:book.id,status:'closed',bid:0,escrow:0,closes_at:'미정'}}};
  const before=JSON.stringify(state);
  try{mountWorldUI(state,{submit(){},isPending(){return false;},assetBase:'/'});const trade=h.get('inventory-panel').children[0];trade.open=true;trade.ontoggle();const icons=trade.children[1].children.filter(n=>n.className==='registered-item-icon');assert.equal(icons.length,2);assert.equal(icons[0].children[0].src,'/'+sword.icon_path);assert.equal(icons[1].children[0].src,'/'+book.icon_path);assert.equal(icons[1].style['--item-rarity-color'],'#E64444');assert.equal(JSON.stringify(state),before);
  }finally{h.close();}
});
