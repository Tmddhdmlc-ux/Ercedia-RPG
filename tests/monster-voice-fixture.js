import {battleFixture} from './battle-fixtures.js';
export function monsterVoiceFixture(){
 const f=battleFixture('dungeon'),enemy=f.scene.battle.participants.find(p=>p.role==='monster'),old=enemy.id,id='ER-NPC-081';enemy.id=id;enemy.name='서리갈기 늑대 · 음향 시연';enemy.creature_multiplier=1;
 f.state.npcStates={[id]:{level:1,realm:'none',strength:10,dexterity:10,intelligence:10,constitution:10,manaStat:10,hp:100,maxHp:100,mp:100,maxMp:100,speed:12,levelHpBonus:0}};
 for(const e of f.scene.battle.events){if(e.actor===old)e.actor=id;if(e.target===old)e.target=id;}
 f.scene.battle.initiative.actor_id=id;for(const r of f.scene.battle.outcome.resources)if(r.id===old)r.id=id;
 f.scene.scene_id='monster-voice-demo';f.scene.battle.battle_id='monster-voice-demo';return f;
}
