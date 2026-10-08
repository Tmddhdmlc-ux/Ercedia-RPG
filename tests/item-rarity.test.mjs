import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rarityStyles,applyItemRarity} from '../web/item-rarity.js';
import {normalizeInventory,mountInventory} from '../web/inventory.js';
import {defaults,load,KEY} from '../web/state.js';
import {normalizeScene} from '../web/scene.js';

const colors={'하급':'#FFFFFF','중급':'#26B75A','고급':'#3489FF','유니크':'#A35CF0','에픽':'#E64444'};
function element(){
  const classes=new Set(),properties=new Map(),attributes=new Map();
  return {dataset:{},children:[],properties,attributes,
    classList:{toggle(key,on){on?classes.add(key):classes.delete(key);},contains:key=>classes.has(key)},
    style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)},
    append(...nodes){this.children.push(...nodes);this.firstChild=this.children[0];this.lastChild=this.children.at(-1);},
    setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key),
    addEventListener(){},contains(){return false;}
  };
}
test('scene input retains each official rarity through inventory save and restore',async()=>{
  const example=JSON.parse(await readFile(new URL('../tampermonkey/example-scene.json',import.meta.url),'utf8'));
  const inventory=Object.keys(colors).map(rarity=>({name:`${rarity} 검증용`,rarity,category:'equipment'}));
  const scene=normalizeScene({...example,inventory});
  const state=defaults();state.inventory=scene.inventory;
  const restored=load({getItem:key=>key===KEY?JSON.stringify(state):null}).state;
  assert.deepEqual(restored.inventory.map(item=>item.rarity),Object.keys(colors));
  for(const rarity of [undefined,'상급','금색','__proto__',{},'<script>']){
    assert.equal(normalizeInventory([{rarity}])[0].rarity,undefined);
  }
});
test('shared frames use exact colors, limit glow to unique/epic and clear reused slots',()=>{
  const slot=element();
  for(const [rarity,color] of Object.entries(colors)){
    applyItemRarity(slot,{rarity});
    assert.equal(slot.dataset.rarity,rarity);
    assert.equal(slot.properties.get('--item-rarity-color'),color);
    assert.equal(slot.properties.get('--item-rarity-glow'),['유니크','에픽'].includes(rarity)?`0 0 6px ${color}38`:'none');
  }
  for(const item of [null,{rarity:'미정'},{}]){
    applyItemRarity(slot,{rarity:'에픽'});applyItemRarity(slot,item);
    assert.equal(slot.classList.contains('item-rarity'),false);
    assert.equal(slot.dataset.rarity,undefined);assert.equal(slot.properties.size,0);
  }
  assert.equal(Object.isFrozen(rarityStyles),true);
});
test('inventory renderer applies rarity and removes frames after filter or item changes',()=>{
  const nodes=new Map();
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element};
  const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'document',{value:document,configurable:true});
  Object.defineProperty(globalThis,'window',{value:{addEventListener(){}},configurable:true});
  try{
    const state=defaults();state.inventory=normalizeInventory([
      {name:'장비',category:'equipment',rarity:'에픽'},
      {name:'재료',category:'material',rarity:'중급'}
    ]);
    const ui=mountInventory(state),slots=nodes.get('inventory-grid').children;
    assert.equal(slots[0].properties.get('--item-rarity-color'),'#E64444');
    assert.equal(slots[1].properties.get('--item-rarity-color'),'#26B75A');
    assert.match(slots[0].attributes.get('aria-label'),/에픽/);
    nodes.get('inventory-categories').children.find(button=>button.dataset.category==='material').onclick();
    assert.equal(slots[0].properties.get('--item-rarity-color'),'#26B75A');
    assert.equal(slots[1].properties.size,0);
    state.inventory=[];ui.render();
    assert.ok(slots.every(slot=>!slot.classList.contains('item-rarity')&&slot.properties.size===0));
  }finally{
    if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
    if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else delete globalThis.window;
  }
});
