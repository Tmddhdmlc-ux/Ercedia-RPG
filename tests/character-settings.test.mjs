import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogData} from '../web/catalog-data.js';
import {normalize,defaults} from '../web/state.js';
import {resolveNPC,npcRankLabel} from '../web/npc-model.js';
import {isCampaignSetting} from '../web/campaign-settings.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const profiles=read('characters/combat_profiles.json').characters;
const audit=read('artifacts/character-settings/establishment-audit.json');
const plan=read('characters/ultimate_cutin_plan.json');
test('163 settings preserve identities, old numerical stats and established realms; new ranks meet level floors',()=>{
  assert.equal(profiles.length,163);assert.equal(new Set(profiles.map(p=>p.id)).size,163);
  assert.deepEqual(new Set(profiles.map(p=>p.id)),new Set(catalogData.npcs.map(p=>p.id)));
  for(const p of profiles){const old=audit.previous[p.id];assert.ok(old);assert.equal(p.basis.affiliation,old.affiliation);
    if(old.stats){assert.deepEqual(p.stats,old.stats);assert.equal(p.level,old.level);}
    if(/나이트/.test(old.rank||''))assert.equal(p.combat_rank,old.rank);
    else if(p.realm!=='none')assert.ok(p.level>={basic:1,expert:20,hyper:45,master:75}[p.realm]);
    if(p.circle)assert.ok(p.level>=[1,10,20,35,45,60,75][p.circle-1]);
    assert.ok(p.main_skill.action&&p.main_skill.limits&&p.basis.appearance);
    assert.ok(p.main_skill.element===null||['물','불','바람','전기','암흑','빛'].includes(p.main_skill.element));
  }
});
test('24 new civilian baselines use canonical HP MP and XP formulas without forcing combat professions',()=>{
  const rows=profiles.filter(p=>p.id.startsWith('ER-COM-'));assert.equal(rows.length,24);
  const roster=read('characters/common_npc_roster.json').characters;
  for(const p of rows){const r=roster.find(c=>c.id===p.id),s=r.stats;
    assert.equal(s.max_hp,Math.max(1,100+10*(s.constitution-10)+3*(s.strength-10)+r.level_hp_bonus));
    assert.equal(s.max_mp,Math.max(0,100+6*(s.mana-10)));assert.equal(r.xp_to_next,Math.floor(100*r.level**1.5));
    if(!['ER-COM-007','ER-COM-014','ER-COM-015','ER-COM-024'].includes(p.id))assert.equal(p.combat_class,'civilian');
  }
});
test('60 two-tier art designs do not grant learned ultimates or future tiers; clergy and monsters remain separate',()=>{
  assert.equal(profiles.filter(p=>p.ultimate_design).length,60);
  for(const p of profiles){const c=plan.characters.find(c=>c.id===p.id);assert.equal(c.runtime_usable,false);
    if(p.ultimate_design){const u=p.ultimate_design;assert.equal(u.learned,false);assert.equal(u.equipped,false);
      if(p.realm==='basic'||p.circle>0&&p.circle<3){assert.equal(u.current_eligible,false);assert.equal(u.low.scope,'future_hypothetical');}
      assert.equal(c.ability_status,'established_visual_design_not_learned');
    }else{assert.equal(c.status,'deferred_non_ultimate_class');assert.ok(c.hold_reason);}
    if(p.combat_class==='cleric'||p.combat_class==='monster')assert.equal(p.circle,0);
  }
  assert.equal(isCampaignSetting('characters/combat_profiles.json'),true);
  assert.equal(isCampaignSetting('CHARACTER_COMBAT_SETTINGS.md'),true);
});
test('public catalog uses established circles and keeps hidden thief identities and skills out; prior save injuries persist',()=>{
  const king=catalogData.npcs.find(c=>c.id==='ER-CORE-002');assert.equal(king.circle,5);assert.match(npcRankLabel(king),/5서클/);
  for(const id of ['ER-COM-015','ER-COM-024']){const p=catalogData.npcs.find(c=>c.id===id);assert.equal(p.name,'신원 미상의 행인');assert.equal(p.mainSkill,null);assert.equal(p.hp,null);}
  const s=defaults();s.npcStates={'ER-COM-001':{hp:25,maxHp:30},'ER-CORE-001':{realm:'expert',level:40}};
  const saved=normalize(s);assert.equal(resolveNPC(saved,'ER-COM-001').hp,25);assert.equal(resolveNPC(saved,'ER-CORE-001').realm,'expert');
  assert.equal(resolveNPC(saved,'serin').realm,'basic');
});
