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
    assert.match(t.h.get('intro-description').textContent,/긴 자기소개는 하지 않아도/);
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'name');
    t.h.get('intro-input').oninput({target:{value:'여행자'}});t.h.get('intro-next').onclick();
    assert.equal(t.state.introDraft.step,'gender');
  }finally{t.h.close();}
});
test('appearance is optional and preset or defer buttons require no free writing',()=>{
  for(const [index,appearance]of [[0,'남성'],[1,'여성'],[2,'밝히지 않음']]){
    const t=setup('gender');try{
      assert.equal(t.h.get('intro-input').hidden,true);assert.equal(t.h.get('intro-next').hidden,true);
      t.h.get('intro-options').children[index].onclick();
      assert.equal(t.state.introDraft.step,'calling');assert.equal(t.state.introDraft.appearance,appearance);
    }finally{t.h.close();}
  }
});
test('creation has no appearance editor, back or previous-game controls; legacy appearance survives',()=>{
  const t=setup('gender',{appearance:'검은 머리의 여행자'});try{
    assert.equal(t.h.get('intro-options').children.length,3);
    assert.equal(t.h.get('intro-input').hidden,true);
    for(const id of ['intro-back','intro-map-back','intro-cancel','intro-map-cancel','intro-skip','restore-previous-game'])assert.equal(t.h.get(id).hidden,true);
    assert.equal(normalize(t.state).introDraft.appearance,'검은 머리의 여행자');
  }finally{t.h.close();}
});
test('background and response require explicit selection and Next without altering passive rules',()=>{
  const t=setup('calling');try{
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'calling');
    const option=t.h.get('intro-options').children[0];assert.equal(option.children.length,1);assert.doesNotMatch(t.h.get('intro-description').textContent,/패시브|후보|효과/);
    option.onclick();assert.equal(t.state.introDraft.step,'calling');assert.equal(t.h.get('intro-next').disabled,false);
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'response');
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'response');
    t.h.get('intro-options').children[1].onclick();t.h.get('intro-next').onclick();
    assert.deepEqual(passiveCandidates(t.state.introDraft.answers),['steadfast','traveler']);
    assert.equal(t.state.introDraft.passive,'');assert.equal(t.h.get('intro-next').disabled,true);assert.equal(t.h.get('intro-options').children[0].children[0].textContent,'굳센 마음');assert.ok(t.h.get('intro-options').children[0].children[1].textContent.length>0);
    t.h.get('intro-options').children[1].onclick();t.h.get('intro-next').onclick();
    assert.equal(t.state.introDraft.step,'goal');assert.equal(t.state.introDraft.passive,'traveler');
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'goal');
    const persona='최고의 대장장이가 되어 여행자들의 검을 만들어주겠다.';
    t.h.get('intro-goal').oninput({target:{value:persona}});assert.equal(normalize(t.state).introDraft.goal,persona);
    t.h.get('intro-next').onclick();assert.equal(t.state.introDraft.step,'kingdom');
  }finally{t.h.close();}
});
