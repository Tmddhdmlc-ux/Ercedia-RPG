import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInventory,capacity} from '../web/inventory.js';
import {defaults,load,KEY} from '../web/state.js';
test('inventory preserves game items and selected screen through save/load',()=>{
  const state=defaults();state.page='inventory';state.inventory=normalizeInventory([{name:'검증용',category:'equipment',quantity:2,description:'상세 설명',effect:'효과'}]);
  assert.deepEqual(load({getItem:key=>key===KEY?JSON.stringify(state):null}).state,state);
  assert.deepEqual(defaults().inventory,[]);
});
test('invalid and oversized game bags are bounded without executable content',()=>{
  assert.deepEqual(normalizeInventory(null),[]);
  const item=normalizeInventory([null,{name:'<script>',category:'__proto__',quantity:Infinity,description:'a'.repeat(2000)}])[0];
  assert.equal(item.category,'misc');assert.equal(item.quantity,1);assert.equal(item.name,'<script>');assert.equal(item.description.length,1000);
  assert.equal(normalizeInventory(Array(100).fill({})).length,capacity);
  assert.equal(normalizeInventory([{quantity:-3}])[0].quantity,1);
});
