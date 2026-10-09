import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './ui-harness.mjs';
import {defaults,normalize} from '../web/state.js';
import {normalizeIntroDraft,passiveCandidates} from '../web/intro-model.js';
import {mountNewGame} from '../web/new-game.js';

function setup(step,extra={}){
  const h=uiHarness();document.querySelectorAll=()=>[];
  const realQueue=globalThis.queueMicrotask,close=h.close;
  globalThis.queueMicrotask=fn=>fn();h.close=()=>{globalThis.queueMicrotask=realQueue;close();};
  const state={...defaults(),introDraft:normalizeIntroDraft({step,name:'여행자',...extra})};
  const ui=mountNewGame(state,{embedded:false,render(){ui.render();},persist(){},chat:{controls(){},isPending(){return false;}}});
  ui.render();return {h,state,ui};
}
test('name explains that no personal introduction is needed and empty names cannot advance',()=>{
  const t=setup('name',{name:''});try{
    assert.match(t.h.get('intro-description').textContent,/자기소개는 필요하지/);
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'name');
    t.h.get('intro-input').oninput({target:{value:'여행자'}});t.h.get('intro-next').onclick();
    assert.equal(t.state.introDraft.step,'gender');
  }finally{t.h.close();}
});
test('appearance is optional and preset or defer buttons require no free writing',()=>{
  for(const [index,appearance]of [[0,'남성'],[1,'여성'],[2,'']]){
    const t=setup('gender');try{
      assert.equal(t.h.get('intro-input').hidden,true);assert.equal(t.h.get('intro-next').hidden,true);
      t.h.get('intro-options').children[index].onclick();
      assert.equal(t.state.introDraft.step,'calling');assert.equal(t.state.introDraft.appearance,appearance);
    }finally{t.h.close();}
  }
});
test('custom appearance remains optional, saved and available when returning to the step',()=>{
  const t=setup('gender');try{
    t.h.get('intro-options').children[3].onclick();assert.equal(t.h.get('intro-input').hidden,false);
    t.h.get('intro-input').oninput({target:{value:'검은 머리의 여행자'}});
    t.h.get('intro-next').onclick();t.h.get('intro-back').onclick();
    assert.equal(t.h.get('intro-input').value,'검은 머리의 여행자');
    assert.equal(normalize(t.state).introDraft.appearance,'검은 머리의 여행자');
    t.h.get('intro-skip').onclick();assert.equal(t.state.introDraft.appearance,'');
  }finally{t.h.close();}
});
test('background and response require explicit selection and Next without altering passive rules',()=>{
  const t=setup('calling');try{
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'calling');
    const option=t.h.get('intro-options').children[0];assert.match(option.children[1].textContent,/굳센 마음/);
    option.onclick();assert.equal(t.state.introDraft.step,'calling');assert.equal(t.h.get('intro-next').disabled,false);
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'response');
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'response');
    t.h.get('intro-options').children[1].onclick();t.h.get('intro-next').onclick();
    assert.deepEqual(passiveCandidates(t.state.introDraft.answers),['steadfast','traveler']);
    assert.equal(t.state.introDraft.passive,'');assert.equal(t.h.get('intro-next').disabled,true);
    t.h.get('intro-options').children[1].onclick();t.h.get('intro-next').onclick();
    assert.equal(t.state.introDraft.step,'kingdom');assert.equal(t.state.introDraft.passive,'traveler');
  }finally{t.h.close();}
});
