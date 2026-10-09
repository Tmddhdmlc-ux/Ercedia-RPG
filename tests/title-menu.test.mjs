import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../web/state.js';
import {mountTitleMenu} from '../web/title-menu.js';
function harness(state,pending=false,assetBase=''){
  const old=globalThis.document,ids=['title-art','title-screen','title-load-game','title-new-game','title-load-note','title-return','intro-input'],nodes=Object.fromEntries(ids.map(id=>[id,{inert:false,hidden:false,focus(){}}]));
  const game={dataset:{},children:[nodes['title-screen'],{inert:false}]},events=new EventTarget();
  globalThis.document={getElementById:id=>nodes[id],querySelector:()=>game,body:{classList:{toggle(){}}},addEventListener:(...args)=>events.addEventListener(...args),dispatchEvent:e=>events.dispatchEvent(e)};
  let ui,started=0;ui=mountTitleMenu(state,{assetBase,isPending:()=>pending,render:()=>ui.refresh(),newGame:{begin({restart}){assert.equal(restart,true);started++;state.introDraft={step:'name'};ui.refresh();}}});
  return {nodes,game,started:()=>started,close(){globalThis.document=old;},cancel(){delete state.introDraft;ui.refresh();events.dispatchEvent(new Event('ercedia:intro-cancelled'));}};
}
test('first screen is the title; empty saves cannot load and new game opens the intro',async()=>{
  const state=defaults(),h=harness(state);try{assert.equal(h.game.dataset.title,'active');assert.equal(h.nodes['title-load-game'].disabled,true);h.nodes['title-load-game'].onclick();assert.equal(h.game.dataset.title,'active');await h.nodes['title-new-game'].onclick();assert.equal(h.started(),1);assert.equal(state.introDraft.step,'name');assert.equal(h.game.dataset.title,'closed');h.cancel();assert.equal(h.game.dataset.title,'active');}finally{h.close();}
});
test('load and return to menu preserve the exact current save',()=>{
  const state=defaults();state.player.name='청명';state.player.hp=54;state.gameState={events:['기존 진행']};const old=structuredClone(state),h=harness(state);
  try{assert.equal(h.nodes['title-load-game'].disabled,false);h.nodes['title-load-game'].onclick();assert.equal(h.game.dataset.title,'closed');assert.equal(h.game.children[1].inert,false);assert.deepEqual(state,old);h.nodes['title-return'].onclick();assert.equal(h.game.dataset.title,'active');assert.deepEqual(state,old);}finally{h.close();}
});
test('pending requests block new game; an existing battle can be loaded without rewriting it',()=>{
  const state=defaults();state.player.name='검증';let h=harness(state,true);try{h.nodes['title-new-game'].onclick();assert.equal(h.started(),0);assert.equal(h.nodes['title-load-game'].disabled,true);}finally{h.close();}
  state.battlePlayback={done:false,paused:true,index:3};const old=structuredClone(state);h=harness(state,true);try{assert.equal(h.nodes['title-new-game'].disabled,true);assert.equal(h.nodes['title-load-game'].disabled,false);h.nodes['title-load-game'].onclick();assert.deepEqual(state,old);assert.equal(h.game.dataset.title,'closed');}finally{h.close();}
});

test('title art uses the installed release asset base without changing game saves',()=>{
 const s=defaults(),before=structuredClone(s),base='https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/release-sha/';
 const h=harness(s,false,base);try{assert.equal(h.nodes['title-art'].src,base+'assets/title/title-ensemble-v1.png');assert.deepEqual(s,before);}finally{h.close();}
});
