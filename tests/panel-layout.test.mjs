import test from 'node:test';
import assert from 'node:assert/strict';
import {mountStatusDashboard,mountPanelLayouts,appendEpicProgress} from '../web/panel-layout.js';
function node(tag='section',cls=''){
 const n={tagName:tag,className:cls,children:[],attributes:{},hidden:false};
 n.classList={add(...v){n.className+=' '+v.join(' ');}};
 n.matches=sel=>sel.startsWith('.')?n.className.split(' ').includes(sel.slice(1)):n.tagName===sel;
 n.querySelectorAll=sel=>n.children.flatMap(c=>[...(c.matches(sel)?[c]:[]),...c.querySelectorAll(sel)]);
 n.querySelector=sel=>n.querySelectorAll(sel)[0];
 const detach=c=>{if(c.parent)c.parent.children.splice(c.parent.children.indexOf(c),1);c.parent=n;};
 n.append=(...cs)=>{for(const c of cs){detach(c);n.children.push(c);}};
 n.prepend=(...cs)=>{for(const c of cs.toReversed()){detach(c);n.children.unshift(c);}};
 n.before=c=>{const p=n.parent;if(c.parent)c.parent.children.splice(c.parent.children.indexOf(c),1);c.parent=p;p.children.splice(p.children.indexOf(n),0,c);};
 n.after=c=>{const p=n.parent;if(c.parent)c.parent.children.splice(c.parent.children.indexOf(c),1);c.parent=p;p.children.splice(p.children.indexOf(n)+1,0,c);};
 n.setAttribute=(k,v)=>n.attributes[k]=v;return n;
}
test('panel regrouping preserves live resource, equipment, quest and lazy shop controls',()=>{
 const old=globalThis.document,ids={};globalThis.document={createElement:tag=>node(tag),getElementById:id=>ids[id]};
 try{
  const content=node(),growth=node(),equipment=node('section','status-equipment'),identity=node('div','player-heading'),resources=[node('div','resource'),node('div','resource mana'),node('div','resource experience')],skills=node('section','status-skills');
  const invest=node('button'),unequip=node('button');let investments=0,removals=0;invest.onclick=()=>investments++;unequip.onclick=()=>removals++;growth.append(invest);equipment.append(unequip);content.append(identity,...resources,node('div','attributes'),equipment,skills);
  const dashboard=mountStatusDashboard(content,growth);assert.equal(dashboard.children[0].children[0],identity);assert.deepEqual(dashboard.children[0].children.slice(1),resources);assert.equal(equipment.parent,dashboard);assert.equal(skills.parent,content);invest.onclick();unequip.onclick();assert.equal(investments,1);assert.equal(removals,1);
  for(const id of ['status-panel','inventory-panel','quests-panel','inventory-categories','inventory-scroll','inventory-note','item-tooltip'])ids[id]=node();
  ids['status-panel'].append(node('nav','panel-subnav'));
  const bag=ids['inventory-panel'],quest=ids['quests-panel'],shop=node('details');let opened=0;shop.ontoggle=()=>opened++;
  const tooltip=ids['item-tooltip'];tooltip.hidden=true;
  bag.append(node('div','inventory-heading'),ids['inventory-categories'],ids['inventory-scroll'],ids['inventory-note'],tooltip,shop);
  const list=node('div','quest-layout'),epic=node('section','regional-epics'),journal=node('details');const accept=node('button');let requests=0;accept.onclick=()=>requests++;list.append(accept);quest.append(node('button','panel-close'),node('header','quest-heading'),node('nav','quest-filters'),list,epic,journal);
  mountPanelLayouts();shop.ontoggle();accept.onclick();assert.equal(opened,1);assert.equal(requests,1);assert.equal(shop.parent.className,'panel-tools');assert.equal(list.parent.className,'quest-main panel-paper');assert.equal(epic.parent.className,'quest-workspace');assert.equal(tooltip.parent.className,'inventory-detail panel-paper');assert.equal(tooltip.hidden,true);assert.equal(journal.parent.className,'panel-tools quest-notes');
 }finally{globalThis.document=old;}
});
test('epic progress reflects actual conditions and clamps only the visual bars',()=>{
 const old=globalThis.document;globalThis.document={createElement:tag=>node(tag)};
 try{const card=node(),conditions={completed:7,affection:-10,eligible:false};appendEpicProgress(card,conditions);assert.equal(card.children[0].children[1].value,5);assert.equal(card.children[1].children[1].value,0);assert.equal(card.children[0].children[0].textContent,'일반 의뢰 완료 7/5');assert.deepEqual(conditions,{completed:7,affection:-10,eligible:false});}finally{globalThis.document=old;}
});
