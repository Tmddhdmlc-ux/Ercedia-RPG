import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {itemCatalog,catalogItem,itemIconURL,lootCatalog} from '../web/item-catalog.js';
import {normalizeInventory} from '../web/inventory.js';
import {normalize,defaults} from '../web/state.js';
import {createGameBridge} from '../integration/game-bridge.js';
import {mountItemLibrary} from '../web/item-library-ui.js';
import {uiHarness} from './ui-harness.mjs';
import {ensureEngine,equipItem,learnBook} from '../web/engine-model.js';
import {initialPlayer} from '../web/intro-model.js';

test('all 410 registered icons and 46 reward sources are included with valid source IDs',()=>{
  assert.equal(itemCatalog.length,410);assert.equal(new Set(itemCatalog.map(p=>p.id)).size,410);
  const assets=JSON.parse(readFileSync('integration/assets.json'));
  for(const item of itemCatalog){assert.ok(existsSync(item.icon_path));assert.ok(assets.includes(item.icon_path));assert.equal(itemIconURL(item,'/'),'/'+item.icon_path);}
  assert.equal(lootCatalog.monsters.length,20);assert.equal(lootCatalog.dungeon_rewards.length,26);
  for(const row of lootCatalog.monsters){assert.equal(row.roll_table.reduce((n,p)=>n+p.weight,0),100);for(const p of row.roll_table)assert.ok(catalogItem(p.item_id));}
  assert.equal(itemIconURL({id:'unregistered',icon_path:'https://bad.invalid/'}),null);
});
test('catalog IDs resolve canonical equipment, books and materials without granting additional items',()=>{
  const state=defaults();state.inventory=normalizeInventory([{catalog_id:'ER-EQ-001',quantity:1},{id:'BK-SWD-001',quantity:1},{id:'MAT-001-1',quantity:2}]);
  assert.deepEqual(state.inventory.map(p=>p.category),['equipment','book','material']);assert.equal(state.inventory[0].name,catalogItem('ER-EQ-001').name);assert.equal(state.inventory[0].catalog_id,'ER-EQ-001');
  assert.deepEqual(normalize(state).inventory,state.inventory);assert.equal(defaults().inventory.length,0);
  const played=defaults();played.player=initialPlayer('검증');played.player.job='검사';played.inventory=state.inventory;const e=ensureEngine(played);assert.equal(e.instances.length,2);equipItem(played,e.instances[0].instance_id);learnBook(played,'BK-SWD-001','실제 학습 확인');assert.equal(played.player.skills.length,1);assert.equal(played.inventory[1].quantity,1);
});
test('v1 bridge exposes detached catalogs and reward tables without mutating ownership',()=>{
  const state=defaults(),before=structuredClone(state),bridge=createGameBridge(state,{apply(){},restore(){},render(){},persist(){}});
  assert.equal(bridge.version,1);const item=bridge.getItem('ER-EQ-001');item.name='changed';assert.notEqual(bridge.getItem('ER-EQ-001').name,'changed');assert.equal(bridge.getItemCatalog().length,410);assert.equal(bridge.getLootTables().dungeon_rewards.length,26);assert.deepEqual(state,before);
});
test('library is deferred and paginated, switches to loot and never changes the bag',()=>{
  const h=uiHarness();try{
    const original=document.createElement;document.createElement=(...args)=>{const p=original(...args);p.style={setProperty(){},removeProperty(){}};return p;};
    const state=defaults(),before=structuredClone(state),library=mountItemLibrary(state,{assetBase:'/'}),root=h.get('inventory-panel').children[0];
    assert.equal(root.children[4].children.length,0);root.open=true;root.ontoggle();assert.equal(root.children[4].children.length,24);assert.equal(root.children[4].children[0].children[0].src,'/assets/items/equipment/ER-EQ-001.png');
    const filter=root.children[2].children[0];filter.value='book';filter.onchange();assert.equal(root.children[4].children.length,24);filter.value='loot';filter.onchange();assert.match(root.children[4].children[0].children[2].textContent,/성공 후 상대 가중치/);
    library.render();assert.deepEqual(state,before);
  }finally{h.close();}
});
