import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,normalizePlayer,damageFormula} from '../web/player.js';
import {defaults,normalize,load,KEY} from '../web/state.js';
test('player and skills persist while older saves retain their scene settings',()=>{
  const state=defaults();state.page='status';state.player={...newPlayer(),name:'테스트',job:'입력 직업',level:3,hp:40,maxHp:100,mp:20,maxMp:50,xp:25,requiredXp:100,strength:12,dexterity:8,intelligence:10,skills:[{name:'테스트 스킬',description:'입력한 설명',formula:'STR * 1.5 + LV * 2',enabled:true}]};
  assert.deepEqual(load({getItem:k=>k===KEY?JSON.stringify(state):null}).state,state);
  const old={...state};delete old.player;old.page='map';
  assert.deepEqual(normalize(old).player,newPlayer());assert.equal(normalize(old).page,'map');
});
test('player numeric bounds and skill records normalize safely',()=>{
  const p=normalizePlayer({level:-1,hp:200,maxHp:100,mp:-5,maxMp:10,strength:Infinity,dexterity:'20',intelligence:3.9,skills:[null,{name:'a'.repeat(200),formula:'STR',enabled:false}]});
  assert.equal(p.level,1);assert.equal(p.hp,100);assert.equal(p.mp,0);assert.equal(p.strength,null);assert.equal(p.dexterity,null);assert.equal(p.intelligence,3);assert.equal(p.skills.length,1);assert.equal(p.skills[0].name.length,60);assert.equal(p.skills[0].enabled,false);
});
test('damage formulas respect precedence, parentheses, Korean aliases and fractions',()=>{
  const p={...newPlayer(),level:3,strength:12,dexterity:8,intelligence:10};
  assert.equal(damageFormula('STR * 1.5 + LV * 2',p).value,24);
  assert.equal(damageFormula('(근력 + 민첩) × 2 + 지능 ÷ 2',p).value,45);
  assert.equal(damageFormula('-STR + .5 * INT',p).value,-7);
  assert.equal(damageFormula('DEX / 3',p).value,2.67);
});
test('malformed formulas, code, missing stats and zero division produce explanatory results',()=>{
  for(const formula of ['alert(1)','constructor','STR;1','2(3)','(2+1','1/0','1+','<img src=x>'])assert.equal(damageFormula(formula,newPlayer()).value,null);
  assert.match(damageFormula('STR + 2',newPlayer()).message,/먼저 입력/);
  assert.equal(damageFormula('10 + 5',newPlayer()).value,15);
  assert.equal(damageFormula('',newPlayer()).value,null);
});
