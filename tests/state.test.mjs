import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize,load,KEY} from '../web/state.js';
test('saved settings preserve each outfit layout, scene and visibility',()=>{
  const s=defaults();s.outfit='casual';s.layouts.casual={scale:190,x:39,y:-76};s.expression='smile';s.index=2;s.page='map';s.region='east';s.background=false;
  assert.deepEqual(load({getItem:k=>k===KEY?JSON.stringify(s):null}).state,s);
  assert.deepEqual(s.layouts.armor,{scale:260,x:50,y:-120});
});
test('corrupt or unavailable storage starts safely',()=>{
  for(const storage of [{getItem:()=>'{broken'},{getItem(){throw Error('blocked');}}]) assert.deepEqual(load(storage).state,defaults());
});
test('untrusted stored values are bounded and asset keys are allowlisted',()=>{
  const raw={version:1,outfit:'../../bad',expression:'<img>',region:'unknown',page:'bad',index:999,background:'false',layouts:{armor:{scale:9999,x:-90,y:Infinity},casual:{scale:'10',x:null,y:20}}};
  const s=normalize(raw);
  assert.equal(s.outfit,'armor');assert.equal(s.expression,'base');assert.equal(s.region,'village');assert.equal(s.page,'story');assert.equal(s.index,3);assert.equal(s.background,true);
  assert.deepEqual(s.layouts.armor,{scale:400,x:0,y:-120});assert.deepEqual(s.layouts.casual,{scale:260,x:50,y:20});
  assert.deepEqual(normalize({version:99}),defaults());
});
